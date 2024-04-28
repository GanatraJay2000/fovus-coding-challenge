#!/bin/bash

# Download the input file from S3
aws s3 cp "s3://$1" input_file.txt

# Append input text to the downloaded file
echo " : $2" >> input_file.txt

# Upload the modified file to S3
aws s3 cp input_file.txt "s3://$3"

# Update DynamoDB with the output file path
aws dynamodb put-item --table-name $4 --item '{ "id": { "S": "'"$5"'" }, "outputFilePath": { "S": "'"$3"'" } }'