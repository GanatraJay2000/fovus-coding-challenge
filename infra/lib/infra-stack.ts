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
        entry: join(__dirname, "getPreSignedUrl.ts"),
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
        entry: join(__dirname, "updateDB.ts"),
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
  }
}
