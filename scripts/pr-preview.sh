#!/usr/bin/env bash

set -Eeuo pipefail

require_environment() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "Required environment variable is missing: ${name}" >&2
      return 1
    fi
  done
}

stack_output() {
  local key="$1"
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue" \
    --output text
}

wait_for_preview() {
  local url="$1"
  local attempt
  for attempt in {1..12}; do
    if curl --fail --silent --show-error --max-time 20 "$url" >/dev/null; then
      return 0
    fi
    echo "Preview is not ready yet (attempt ${attempt}/12); retrying..."
    sleep 10
  done
  return 1
}

deploy_preview() {
  require_environment \
    ECR_REPOSITORY_NAME ECR_REPOSITORY_URI ECS_CLUSTER_ARN \
    CLOUD_MAP_NAMESPACE_ID PRIVATE_SUBNET_A PRIVATE_SUBNET_B \
    ECS_SECURITY_GROUP_ID LAMBDA_SECURITY_GROUP_ID \
    ECS_TASK_EXECUTION_ROLE_ARN ECS_TASK_ROLE_ARN LAMBDA_EXECUTION_ROLE_ARN \
    DATABASE_ENDPOINT DATABASE_PASSWORD_SECRET_ARN SAM_ARTIFACT_BUCKET \
    CFN_EXECUTION_ROLE_ARN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN \
    CLOUDFLARE_PAGES_PROJECT

  FRONTEND_ORIGIN="https://${ENVIRONMENT_NAME}.${CLOUDFLARE_PAGES_PROJECT}.pages.dev"
  IMAGE_URI="${ECR_REPOSITORY_URI}:${GIT_SHA}"
  export FRONTEND_ORIGIN IMAGE_URI

  go -C apps/server test ./...
  pnpm install --frozen-lockfile
  VITE_SERVER_URL="$FRONTEND_ORIGIN" pnpm run check-types

  local registry_host="${ECR_REPOSITORY_URI%%/*}"
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$registry_host"

  if aws ecr describe-images \
    --region "$AWS_REGION" \
    --repository-name "$ECR_REPOSITORY_NAME" \
    --image-ids "imageTag=${GIT_SHA}" >/dev/null 2>&1; then
    echo "Reusing existing image ${IMAGE_URI}"
  else
    docker build \
      --platform linux/amd64 \
      --file apps/server/Dockerfile \
      --tag "$IMAGE_URI" \
      .
    docker push "$IMAGE_URI"
  fi

  sam build --template-file template.preview.yaml
  sam deploy \
    --template-file .aws-sam/build/template.yaml \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --s3-bucket "$SAM_ARTIFACT_BUCKET" \
    --s3-prefix "$STACK_NAME" \
    --role-arn "$CFN_EXECUTION_ROLE_ARN" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      EnvironmentName="$ENVIRONMENT_NAME" \
      BackendImageTag="$GIT_SHA" \
      BackendRepositoryUri="$ECR_REPOSITORY_URI" \
      EcsClusterArn="$ECS_CLUSTER_ARN" \
      CloudMapNamespaceId="$CLOUD_MAP_NAMESPACE_ID" \
      PrivateSubnetA="$PRIVATE_SUBNET_A" \
      PrivateSubnetB="$PRIVATE_SUBNET_B" \
      EcsSecurityGroupId="$ECS_SECURITY_GROUP_ID" \
      LambdaSecurityGroupId="$LAMBDA_SECURITY_GROUP_ID" \
      EcsTaskExecutionRoleArn="$ECS_TASK_EXECUTION_ROLE_ARN" \
      EcsTaskRoleArn="$ECS_TASK_ROLE_ARN" \
      LambdaExecutionRoleArn="$LAMBDA_EXECUTION_ROLE_ARN" \
      DatabaseEndpoint="$DATABASE_ENDPOINT" \
      DatabasePasswordSecretArn="$DATABASE_PASSWORD_SECRET_ARN" \
      DatabaseName="$DATABASE_NAME" \
      FrontendOrigin="$FRONTEND_ORIGIN" \
    --tags \
      Project=github-info \
      Environment="$ENVIRONMENT_NAME" \
      ManagedBy=CodeBuild

  local api_url
  api_url="$(stack_output ApiUrl)"
  test -n "$api_url"
  wait_for_preview "$api_url"

  VITE_SERVER_URL="${api_url%/}" pnpm --filter web build
  wrangler pages deploy apps/web/dist \
    --project-name "$CLOUDFLARE_PAGES_PROJECT" \
    --branch "$ENVIRONMENT_NAME"

  wait_for_preview "$FRONTEND_ORIGIN"
  echo "Preview API: ${api_url}"
  echo "Preview frontend: ${FRONTEND_ORIGIN}"
}

cleanup_database() {
  local service_arn task_definition task_arn exit_code stopped_reason
  service_arn="$(stack_output EcsServiceArn)" || return 1
  task_definition="$(stack_output TaskDefinitionArn)" || return 1
  if [[ -z "$service_arn" || -z "$task_definition" ]]; then
    echo "Preview stack does not expose cleanup resources" >&2
    return 1
  fi

  aws ecs update-service \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER_ARN" \
    --service "$service_arn" \
    --desired-count 0 >/dev/null || return 1
  aws ecs wait services-stable \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER_ARN" \
    --services "$service_arn" || return 1

  task_arn="$(aws ecs run-task \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER_ARN" \
    --task-definition "$task_definition" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_A},${PRIVATE_SUBNET_B}],securityGroups=[${ECS_SECURITY_GROUP_ID}],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"server","command":["dropdb"]}]}' \
    --query 'tasks[0].taskArn' \
    --output text)" || return 1
  if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
    echo "Failed to start the preview database cleanup task" >&2
    return 1
  fi

  aws ecs wait tasks-stopped \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER_ARN" \
    --tasks "$task_arn" || return 1
  read -r exit_code stopped_reason < <(aws ecs describe-tasks \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER_ARN" \
    --tasks "$task_arn" \
    --query 'tasks[0].[containers[0].exitCode,stoppedReason]' \
    --output text) || return 1
  if [[ "$exit_code" != "0" ]]; then
    echo "Database cleanup failed: exit=${exit_code}, reason=${stopped_reason}" >&2
    return 1
  fi
}

destroy_preview() {
  require_environment \
    ECS_CLUSTER_ARN PRIVATE_SUBNET_A PRIVATE_SUBNET_B \
    ECS_SECURITY_GROUP_ID CFN_EXECUTION_ROLE_ARN

  if ! aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    echo "Preview stack ${STACK_NAME} does not exist; nothing to remove."
    return 0
  fi

  local cleanup_failed=0
  cleanup_database || cleanup_failed=1

  aws cloudformation delete-stack \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --role-arn "$CFN_EXECUTION_ROLE_ARN"
  aws cloudformation wait stack-delete-complete \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME"
  echo "Deleted preview stack ${STACK_NAME}"

  if (( cleanup_failed != 0 )); then
    echo "The stack was removed, but its preview database could not be dropped." >&2
    return 1
  fi
}

require_environment ACTION PR_NUMBER GIT_SHA AWS_REGION
if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "PR_NUMBER must contain digits only" >&2
  exit 2
fi
if [[ ! "$GIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "GIT_SHA must be a 40-character lowercase commit SHA" >&2
  exit 2
fi

ENVIRONMENT_NAME="pr-${PR_NUMBER}"
STACK_NAME="github-info-${ENVIRONMENT_NAME}"
DATABASE_NAME="personal_info_pr_${PR_NUMBER}"
export ENVIRONMENT_NAME STACK_NAME DATABASE_NAME

case "$ACTION" in
  deploy)
    deploy_preview
    ;;
  destroy)
    destroy_preview
    ;;
  *)
    echo "ACTION must be deploy or destroy" >&2
    exit 2
    ;;
esac
