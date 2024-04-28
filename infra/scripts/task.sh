#!/bin/bash

original_id=$1
tableName=$2
id=$3

response=$(aws dynamodb get-item --table-name ${tableName} --key '{ "id": { "S": "'"${original_id}"'" } }')
if [ $? -ne 0 ]; then
    echo "Error: Dynamo GET Failed."
    exit 1
fi

textInput=$(echo $response | jq -r '.Item.textInput.S')
fileInputPath=$(echo $response | jq -r '.Item.fileInputPath.S')
if [ -z "$textInput" ] || [ -z "$fileInputPath" ]; then
    echo "Error: textInput or fileInputPath Undefined."
    exit 1
fi

filePathArr=(${fileInputPath//// })
outputFilePath="${filePathArr[0]}/Output_${filePathArr[1]}"

aws s3 cp "s3://${fileInputPath}" input_file.txt
if [ $? -ne 0 ]; then
    echo "Error: S3 GET Failed."
    exit 1
fi

echo " : ${textInput}" >> input_file.txt

aws s3 cp input_file.txt "s3://${outputFilePath}"
if [ $? -ne 0 ]; then
    echo "Error: S3 PUT Failed."
    exit 1
fi

aws dynamodb put-item --table-name $tableName --item '{ "id": { "S": "'"$id"'" }, "outputFilePath": { "S": "'"${outputFilePath}"'" } }'
if [ $? -ne 0 ]; then
    echo "Error: DynamoDB PUT Failed."
    exit 1
fi

echo "Success: Script Executed."