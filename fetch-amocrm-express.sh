#!/bin/bash
# Fetch Express Course sales from AmoCRM pipeline 10350882

TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjNhYTA0ZjQyZGQxMmUwYTJhNjc1NDdiMzljNzQxNmU1YmI0YzI5Yjk4Y2E1M2I4M2EzYzQ3MjJlYjcxZjAwNzM5NjVlY2JiMjU0ODlmYzNmIn0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIzYWEwNGY0MmRkMTJlMGEyYTY3NTQ3YjM5Yzc0MTZlNWJiNGMyOWI5OGNhNTNiODNhM2M0NzIyZWI3MWYwMDczOTY1ZWNiYjI1NDg5ZmMzZiIsImlhdCI6MTc2NjQ5ODk1MSwibmJmIjoxNzY2NDk4OTUxLCJleHAiOjE4Mzg3NjQ4MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiM2RhODUzNjctNmQ2MS00ODc3LTkwNGItOGViNjY4MDlkZTAxIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.XR2ND4wGxOZjaewKvyNmefDA--Gz8-YHFO7ipqKz8nLr7cS1mMN7O6TjpTpRP8alYGTLkVu2jrqucZ6O0eURJlm1ZkRYllOyth9kjVpyZUQVircSUw0RJrHuJ-9rd9i7f5JQxUW6-LZJWSMx9OKyqQ7GrdpLeTOtbOx7nZWhddUCr-c6uev9oy6AdRDnL8NGa9L11esShUWdNdt5czxzj_BYXG9X1KjtvPfMWOZAo8jNShbzJBfjLMp4ioi1aeABZdgCsQPFvVQQyM_T_fm88zUEgYEGV16AuGeKqrOZxr1quZ9Ismab1Sudb8QGinkWg__S_DCKvQW8G6J27hlQSA"

PIPELINE_ID=10350882
STATUS_SUCCESS=142

echo "🔍 Fetching Express Course sales from AmoCRM..."
echo "   Pipeline: $PIPELINE_ID"
echo "   Status: Успешно реализовано ($STATUS_SUCCESS)"
echo ""

# Fetch leads with status 142 (Успешно реализовано)
curl -s "https://onaiagencykz.amocrm.ru/api/v4/leads" \
  -G \
  --data-urlencode "filter[pipeline_id]=$PIPELINE_ID" \
  --data-urlencode "filter[statuses][0][status_id]=$STATUS_SUCCESS" \
  --data-urlencode "filter[statuses][0][pipeline_id]=$PIPELINE_ID" \
  --data-urlencode "limit=250" \
  --data-urlencode "with=contacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" > /tmp/amocrm_express.json

# Count and show results
echo "📊 Results:"
cat /tmp/amocrm_express.json | jq '._embedded.leads | length' 2>/dev/null || echo "Error parsing response"
echo ""
echo "📋 First 3 deals:"
cat /tmp/amocrm_express.json | jq '._embedded.leads[:3] | .[] | {id, name, price}' 2>/dev/null
