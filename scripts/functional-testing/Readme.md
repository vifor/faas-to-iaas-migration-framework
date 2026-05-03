# Functional Testing — Sample Output

Run command:

```bash
k6 run --no-usage-report \
  -e API_KEY=YOUR_API_KEY \
  -e COGNITO_PASSWORD=YOUR_PASSWORD \
  scripts/functional-testing/functional-test.js
```

Expected output:

```text
PASS  JWT obtained (1508 chars)

PASS  GET /admin/store/store-001
      Status   : 200  |  Duration: 1967 ms
      Is array : true  |  Items: 1
      First    : {"id":"store-001","name":"Tienda Principal",...}

PASS  GET /store/store-001/pets
      Status   : 200  |  Duration: 2447 ms
      Is array : true  |  Items: 2

checks_succeeded: 100.00%  (6 out of 6)
```
