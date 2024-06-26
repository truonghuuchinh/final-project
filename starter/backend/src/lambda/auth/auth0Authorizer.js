import jsonwebtoken from 'jsonwebtoken'
import { createLogger } from '../../utils/logger.mjs'
import JwksRsa from 'jwks-rsa';

const logger = createLogger('auth')

const jwksUrl = 'https://dev-pn3bve1enmepoa2i.us.auth0.com/.well-known/jwks.json'

export async function handler(event) {
  try {
    logger.info("Start authenticating user....");
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info(`User ${jwtToken.sub} was authenticated.`);
    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader) {
  const token = getToken(authHeader)

  // Auth0 certificate to verify JWT token signature
  // Auth0: Advanced Settings: Endpoints: JSON Web Key Set
  const client = JwksRsa({ jwksUri: jwksUrl });
  const kid = 'WHH8UZlj6XPCEkhZrLDNf';
  const certSigningKey = await client.getSigningKey(kid); 
  const signingKey = certSigningKey.getPublicKey();
  return jsonwebtoken.verify(token, signingKey, { algorithms: ['RS256'] })
}

function getToken(authHeader) {
  if (!authHeader) throw new Error('No authentication header')
  
  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}
