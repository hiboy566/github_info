# Pull-request preview environments

Each same-repository pull request gets an isolated Go application environment while reusing the paid production foundation.

## Architecture

```text
GitHub pull_request
  -> GitHub OIDC trigger role
  -> AWS CodeBuild
  -> shared ECR image tagged with the commit SHA
  -> github-info-pr-<number> CloudFormation stack
       -> ECS Fargate service
       -> api-pr-<number>.github-info.local Cloud Map service
       -> API Gateway + Lambda private proxy
       -> personal_info_pr_<number> database on shared Aurora
  -> Cloudflare Pages pr-<number> branch deployment
```

The preview stack does not create another VPC, NAT Gateway, ALB, Aurora cluster, ECR repository, ECS cluster, or IAM runtime role.

## IAM roles

The bootstrap stack creates exactly three delivery roles:

| Role | Trusted principal | Purpose |
| --- | --- | --- |
| `github-info-pr-trigger` | GitHub OIDC for this repository's PR subject | Start and monitor the one preview CodeBuild project |
| `github-info-pr-codebuild` | The preview CodeBuild project | Test, push ECR images, manage preview stacks, publish Cloudflare Pages, and run database cleanup tasks |
| `github-info-pr-cloudformation` | CloudFormation | Create and delete only the AWS resource types used by preview stacks |

The existing ECS task execution, ECS task, and Lambda execution roles are runtime identities and are passed into preview stacks. They are not part of the three-role delivery chain.

## 1. Create the Cloudflare Pages project

In Cloudflare, open **Workers & Pages**, create a **Direct Upload** Pages project, and name it `github-info-preview`.

Create a custom Cloudflare API token with only:

- Account scope: the account that owns the Pages project
- Permission: `Cloudflare Pages: Edit`

Record the 32-character Cloudflare Account ID and the token. Do not add the token to the repository.

Store the token in AWS Secrets Manager using the AWS console:

```text
Secret type: Other type of secret
Key/value: Cloudflare_Token = <Cloudflare token>
Secret name: github-info/pr-preview/cloudflare-api-token
```

Record the resulting Secret ARN. The token itself does not need to leave Cloudflare and AWS.

## 2. Deploy the AWS bootstrap stack

Run this from the repository root:

```bash
aws cloudformation deploy \
  --region ap-southeast-2 \
  --stack-name github-info-pr-bootstrap \
  --template-file infra/preview-bootstrap.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    CloudflareAccountId=<cloudflare-account-id> \
    CloudflareApiTokenSecretArn=<cloudflare-token-secret-arn> \
    CloudflarePagesProject=github-info-preview
```

The template defaults point at the current `github-info` production foundation in AWS account `956959393973`, region `ap-southeast-2`. Override those parameters when the shared stack changes.

## 3. Configure GitHub Actions variables

Read the bootstrap outputs:

```bash
aws cloudformation describe-stacks \
  --region ap-southeast-2 \
  --stack-name github-info-pr-bootstrap \
  --query 'Stacks[0].Outputs' \
  --output table
```

Add these repository Actions variables under **Settings -> Secrets and variables -> Actions -> Variables**:

```text
AWS_PR_TRIGGER_ROLE_ARN=<TriggerRoleArn output>
CLOUDFLARE_PAGES_PROJECT=github-info-preview
```

The Cloudflare API token is read by CodeBuild directly from AWS Secrets Manager and must not be configured in GitHub.

## 4. Preview lifecycle

Opening, reopening, or updating a same-repository PR triggers `.github/workflows/pr-preview.yml`.

For PR 123, the stable frontend URL is:

```text
https://pr-123.github-info-preview.pages.dev
```

The workflow waits for CodeBuild, and CodeBuild verifies the API and frontend before succeeding. The API Gateway URL is available in the `github-info-pr-123` CloudFormation outputs.

Closing the PR triggers `ACTION=destroy`. CodeBuild performs this sequence:

1. Scale the PR ECS service to zero.
2. Run the image's `dropdb` command as a one-off Fargate task.
3. Drop only a database matching `personal_info_pr_<digits>`.
4. Delete the `github-info-pr-<number>` stack.

Cloudflare retains immutable preview deployment history. The backend and database are removed, so an old static preview cannot call a live PR API.

## Security notes

- Fork pull requests are skipped before AWS credentials are requested.
- GitHub can only start and inspect the named CodeBuild project.
- CodeBuild can pass only the preview CloudFormation role and the existing ECS cleanup roles.
- CloudFormation cannot create or modify IAM roles.
- The cleanup binary refuses to drop production or arbitrary database names.
- The Cloudflare token is a masked Secrets Manager environment variable in CodeBuild.

Repository members who can push branches can execute code in CodeBuild. Protect the preview workflow and build scripts with required reviews before allowing additional collaborators to push branches.

## Troubleshooting

```bash
# Latest CodeBuild runs
aws codebuild list-builds-for-project \
  --region ap-southeast-2 \
  --project-name github-info-pr-preview

# Preview stack events
aws cloudformation describe-stack-events \
  --region ap-southeast-2 \
  --stack-name github-info-pr-123

# Preview service state
aws ecs describe-services \
  --region ap-southeast-2 \
  --cluster github-info-cluster \
  --services github-info-pr-123

# Preview application logs
aws logs tail /ecs/github-info-pr-123 \
  --region ap-southeast-2 \
  --since 10m
```
