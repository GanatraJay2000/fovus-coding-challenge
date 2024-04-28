import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { join } from "path";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiGateway = new cdk.aws_apigateway.RestApi(this, "Api"); // API Gateway

    const inputTable = new cdk.aws_dynamodb.Table(this, "UserInputs", {
      partitionKey: {
        name: "id",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
    });

    const fileInputBucket = new cdk.aws_s3.Bucket(this, "FileInputBucket", {
      cors: [
        {
          allowedMethods: [
            cdk.aws_s3.HttpMethods.GET,
            cdk.aws_s3.HttpMethods.PUT,
            cdk.aws_s3.HttpMethods.POST,
            cdk.aws_s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const scriptsBucket = new cdk.aws_s3.Bucket(this, "ScriptsBucket");
    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployScripts", {
      sources: [cdk.aws_s3_deployment.Source.asset("./scripts")],
      destinationBucket: scriptsBucket,
    });

    const preSignerLambdaRole = new cdk.aws_iam.Role(
      this,
      "preSignerLambdaRole",
      {
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    const preSignerLambdaPolicy = new cdk.aws_iam.PolicyStatement({
      actions: ["s3:PutObject"],
      resources: [fileInputBucket.bucketArn, `${fileInputBucket.bucketArn}/*`],
    });
    preSignerLambdaRole.addToPolicy(preSignerLambdaPolicy);

    const getPresignedUrlLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "GetPresignedUrl",
      {
        entry: join(__dirname, "handlers", "getPreSignedUrl.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: fileInputBucket.bucketName,
        },
        role: preSignerLambdaRole,
      }
    );

    const getPreSignedUrlAPI = apiGateway.root.addResource("getPreSignedUrl");
    getPreSignedUrlAPI.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(getPresignedUrlLambda)
    );

    getPreSignedUrlAPI.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["POST"],
    });

    const updateDBLambdaRole = new cdk.aws_iam.Role(
      this,
      "updateDBLambdaRole",
      {
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    const updateDBLambdaPolicy = new cdk.aws_iam.PolicyStatement({
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      resources: [inputTable.tableArn],
    });
    updateDBLambdaRole.addToPolicy(updateDBLambdaPolicy);

    const updateDBLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "UploadFile",
      {
        entry: join(__dirname, "handlers", "updateDB.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: inputTable.tableName,
          BUCKET_NAME: fileInputBucket.bucketName,
        },
        role: updateDBLambdaRole,
      }
    );

    const updateDBAPI = apiGateway.root.addResource("updateDB");
    updateDBAPI.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(updateDBLambda)
    );
    updateDBAPI.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["POST"],
    });

    const tempEC2S3AccessPolicy = new cdk.aws_iam.PolicyStatement({
      actions: ["s3:PutObject", "s3:GetObject"],
      resources: [
        fileInputBucket.bucketArn,
        `${fileInputBucket.bucketArn}/*`,
        scriptsBucket.bucketArn,
        `${scriptsBucket.bucketArn}/*`,
      ],
    });
    const tempEC2DynamoDBAccessPolicy = new cdk.aws_iam.PolicyStatement({
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      resources: [inputTable.tableArn],
    });

    const tempEC2Role = new cdk.aws_iam.Role(this, "tempEC2Role", {
      assumedBy: new cdk.aws_iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    tempEC2Role.addToPolicy(tempEC2S3AccessPolicy);
    tempEC2Role.addToPolicy(tempEC2DynamoDBAccessPolicy);

    const instanceProfileVarName = "tempEC2InstanceProfile";
    const tempEC2InstanceProfile = new cdk.aws_iam.CfnInstanceProfile(
      this,
      instanceProfileVarName,
      {
        roles: [tempEC2Role.roleName],
        path: "/",
        instanceProfileName: instanceProfileVarName,
      }
    );

    tempEC2InstanceProfile.node.addDependency(tempEC2Role);

    const dbTriggerLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "dbTrigger",
      {
        entry: join(__dirname, "handlers", "dbTrigger.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: inputTable.tableName,
          FILE_BUCKET_NAME: fileInputBucket.bucketName,
          SCRIPTS_BUCKET_NAME: scriptsBucket.bucketName,
          EC2_INSTANCE_PROFILE_NAME: tempEC2InstanceProfile.ref.toString(),
          INSTANCE_PROFILE_VAR_NAME: instanceProfileVarName,
        },
      }
    );

    dbTriggerLambda.node.addDependency(tempEC2InstanceProfile);

    dbTriggerLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          "ec2:RunInstances",
          "iam:CreateInstanceProfile",
          "iam:AddRoleToInstanceProfile",
          "iam:PassRole",
          "iam:GetInstanceProfile",
        ],
        resources: ["*"],
      })
    );

    dbTriggerLambda.addEventSource(
      new cdk.aws_lambda_event_sources.DynamoEventSource(inputTable, {
        startingPosition: cdk.aws_lambda.StartingPosition.LATEST,
      })
    );
  }
}
