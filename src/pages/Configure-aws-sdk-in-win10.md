---
title: "Configure aws-sdk in win10"
date: 2018-11-18 12:28:02
tags: ["aws", "powershell"]
---

## Install for powershell

First we need to run the powershell as administrator.

With PowerShell 5.0 or higher, the installation can be done with only one line:

```powershell
Install-Module -Name AWSPowerShell
```

## Set credential

To use aws cli in powershell, we need to run:

```powershell
Set-ExecutionPolicy RemoteSigned
```

to allow aws cli to run.

Then we can set the config file with

```powershell
Set-AWSCredential -AccessKey xxx -SecretKey xxx -StoreAs MyProfileName
```

The access_key and secret_key can be found from IAM in aws console.

And then for windows, we need to add a credential file at C:\Users\zhuzilin\\.aws\credentials

The content of the file could be:

```
[default]
aws_access_key_id={YOUR_ACCESS_KEY_ID}
aws_secret_access_key={YOUR_SECRET_ACCESS_KEY}

[profile2]
aws_access_key_id={YOUR_ACCESS_KEY_ID}
aws_secret_access_key={YOUR_SECRET_ACCESS_KEY}
```

## Use aws-sdk in node

Here is an example of using dynamodb

```javascript
let AWS = require('aws-sdk');
let doc = require('dynamodb-doc');

// Load the AWS API Key from my local, private configuration file.
let credentials = new AWS.SharedIniFileCredentials();
// Set the credential.
AWS.config.credentials = credentials;

AWS.config.update({region: 'us-east-1'});
let awsClient = new AWS.DynamoDB();
let dynamo = new doc.DynamoDB(awsClient);
```

Here the SharedIniFileCredentials() is using the default credentials.

## Reference

- https://docs.aws.amazon.com/zh_cn/sdk-for-java/v1/developer-guide/credentials.html
- https://docs.aws.amazon.com/zh_cn/powershell/latest/userguide/pstools-getting-set-up-windows.html



