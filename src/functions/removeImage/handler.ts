import AWS from 'aws-sdk';
import Boom from '@hapi/boom';

import { middyfy } from '../../libs/lambda';
import { Event } from '../../interface/interface';
import validateSchema from './validateSchema';

const BUCKET_NAME = process.env.FILE_UPLOAD_BUCKET_NAME;

const handler = async (event: Event<string>) => {
  const s3 = new AWS.S3();
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  const { image: idImage } = event.pathParameters;
  const queryScan = {
    TableName: 'Images',
    FilterExpression: 'id = :this_id',
    ExpressionAttributeValues: { ':this_id': idImage },
  };
  let imageLink = '';
  await dynamodb
    .scan(queryScan, function (err, data) {
      if (err) {
        console.error(err);
      } else {
        console.log(data);
        const { Items } = data;
        return (imageLink = Items[0].imageLink);
      }
    })
    .promise()
    .catch(error => {
      throw Boom.badImplementation(error.message);
    });
  const paramsDelete = {
    TableName: 'Images',
    Key: {
      id: idImage,
    },
  };
  await dynamodb
    .delete(paramsDelete, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    })
    .promise()
    .catch(error => {
      throw Boom.badImplementation(error.message);
    });

  // remove image(object) from bucket
  const image = imageLink.replace(
    'https://s3.amazonaws.com/image.s3.bucket/images/',
    '',
  );
  const params = {
    Bucket: BUCKET_NAME,
    Key: `images/${image}`,
  };
  await s3
    .deleteObject(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      } else {
        console.log(data);
      }
    })
    .promise()
    .catch(error => {
      throw Boom.badImplementation(error.message);
    });

  const body = {
    status: 'success',
    message: `Remove image ${image} successful`,
  };

  return {
    body,
    statusCode: 200,
  };
};

export const removeImage = middyfy(handler, validateSchema);
