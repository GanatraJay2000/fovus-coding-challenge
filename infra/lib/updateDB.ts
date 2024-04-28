import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { nanoid } from "nanoid";

const dynamoDBClient = new DynamoDBClient({});

export const handler = async (event: {
  body: string;
}): Promise<{ statusCode: number; body: string; headers: unknown }> => {
  const tableName = process.env.TABLE_NAME;
  const bucketName = process.env.BUCKET_NAME;

  if (tableName === undefined || bucketName === undefined) {
    throw new Error("Missing environment variable");
  }

  const { textInput, fileInputPath } = JSON.parse(event.body) as {
    textInput?: string;
    fileInputPath?: string;
  };

  const id = nanoid();

  if (textInput === undefined || fileInputPath === undefined) {
    return Promise.resolve({
      statusCode: 400,
      body: JSON.stringify({ message: "Missing textInput or fileInputPath" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  await dynamoDBClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: id },
        textInput: { S: textInput },
        fileInputPath: { S: bucketName + "/" + fileInputPath },
      },
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Item added to DynamoDB" }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
