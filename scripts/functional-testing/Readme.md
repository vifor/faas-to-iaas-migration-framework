k6 run --no-usage-report -e API_KEY=0e7da1c5-960f-4c69-9adf-fe176e1e35d4 scripts/functional-testing/functional-test.js 2>&1

PASS  JWT obtained (1508 chars)

PASS  GET /admin/store/store-001
      Status   : 200  |  Duration: 1967 ms
      Is array : true  |  Items: 1
      First    : {"id":"store-001","name":"Tienda Principal",...}

PASS  GET /store/store-001/pets
      Status   : 200  |  Duration: 2447 ms
      Is array : true  |  Items: 2

checks_succeeded: 100.00%  (6 out of 6)

