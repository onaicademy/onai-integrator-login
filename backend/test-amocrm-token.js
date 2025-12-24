const axios = require('axios');

const AMOCRM_DOMAIN = 'onaiagencykz';
const AMOCRM_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjNhYTA0ZjQyZGQxMmUwYTJhNjc1NDdiMzljNzQxNmU1YmI0YzI5Yjk4Y2E1M2I4M2EzYzQ3MjJlYjcxZjAwNzM5NjVlY2JiMjU0ODlmYzNmIn0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIzYWEwNGY0MmRkMTJlMGEyYTY3NTQ3YjM5Yzc0MTZlNWJiNGMyOWI5OGNhNTNiODNhM2M0NzIyZWI3MWYwMDczOTY1ZWNiYjI1NDg5ZmMzZiIsImlhdCI6MTc2NjQ5ODk1MSwibmJmIjoxNzY2NDk4OTUxLCJleHAiOjE4Mzg3NjQ4MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiM2RhODUzNjctNmQ2MS00ODc3LTkwNGItOGViNjY4MDlkZTAxIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.XR2ND4wGxOZjaewKvyNmefDA--Gz8-YHFO7ipqKz8nLr7cS1mMN7O6TjpTpRP8alYGTLkVu2jrqucZ6O0eURJlm1ZkRYllOyth9kjVpyZUQVircSUw0RJrHuJ-9rd9i7f5JQxUW6-LZJWSMx9OKyqQ7GrdpLeTOtbOx7nZWhddUCr-c6uev9oy6AdRDnL8NGa9L11esShUWdNdt5czxzj_BYXG9X1KjtvPfMWOZAo8jNShbzJBfjLMp4ioi1aeABZdgCsQPFvVQQyM_T_fm88zUEgYEGV16AuGeKqrOZxr1quZ9Ismab1Sudb8QGinkWg__S_DCKvQW8G6J27hlQSA';

async function testToken() {
  console.log('\n===============================================');
  console.log('TESTING AMOCRM TOKEN');
  console.log('===============================================\n');
  
  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/account`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('SUCCESS! Token is valid!\n');
    console.log(`Account Name: ${response.data.name}`);
    console.log(`Account ID: ${response.data.id}`);
    console.log(`Country: ${response.data.country}`);
    console.log(`Subdomain: ${response.data.subdomain}`);
    
    // Get leads count
    const leadsRes = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads?limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`\nTotal leads in AmoCRM: ${leadsRes.data._page?.total || 'unknown'}`);
    
    return true;
  } catch (error) {
    console.error('FAILED! Token is invalid or expired');
    console.error(`Error: ${error.response?.status} ${error.response?.statusText}`);
    console.error(`Details: ${JSON.stringify(error.response?.data)}`);
    return false;
  }
}

testToken().catch(console.error);
