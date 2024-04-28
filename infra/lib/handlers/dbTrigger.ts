import {
  EC2Client,
  RunInstancesCommand,
  RunInstancesCommandInput,
} from "@aws-sdk/client-ec2";
import { DynamoDBStreamEvent } from "aws-lambda";
import { encode } from "js-base64";
import { nanoid } from "nanoid";

const ec2Client = new EC2Client({ region: "us-east-1" });

export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    const tableName = process.env.TABLE_NAME;
    const fileBucketName = process.env.FILE_BUCKET_NAME;
    const scriptsBucketName = process.env.SCRIPTS_BUCKET_NAME;
    const instanceProfileVarName = process.env.INSTANCE_PROFILE_VAR_NAME;

    if (
      tableName === undefined ||
      fileBucketName === undefined ||
      scriptsBucketName === undefined ||
      instanceProfileVarName === undefined
    ) {
      throw new Error("Missing environment variable");
    }

    const scriptUri = `${scriptsBucketName}/task.sh`;

    const record = event.Records[0];
    if (record["eventName"] == "INSERT") {
      const id = nanoid();
      const textInput = record.dynamodb!.NewImage!.textInput.S;
      const fileInputPath = record.dynamodb!.NewImage!.fileInputPath.S;

      if (fileInputPath === undefined || textInput === undefined) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Programatically added by ec2" }),
        };
      }
      const fip = fileInputPath;
      const fileOutputPath = fileBucketName + "/Output_" + fip.split("/").pop();

      const input = {
        ImageId: "ami-04e5276ebb8451442",
        InstanceType: "t2.micro",
        MaxCount: 1,
        MinCount: 1,
        InstanceInitiatedShutdownBehavior: "terminate",
        IamInstanceProfile: {
          Name: instanceProfileVarName,
        },
        SecurityGroupIds: ["sg-09d1c6065116c8af3"],
        UserData: encode(
          `#!/bin/bash\naws s3 cp "s3://${scriptUri}" task.sh\nbash task.sh ${fileInputPath} "${textInput}" ${fileOutputPath} ${tableName} ${id}\nshutdown -h now`
        ),
      } as RunInstancesCommandInput;

      const command = new RunInstancesCommand(input);
      const response = await ec2Client.send(command);

      console.log("Response", response);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: response }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Wrong DB Action" }),
    };
  } catch (error) {
    console.error("Error running EC2 instance:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error running EC2 instance" }),
    };
  }
};
