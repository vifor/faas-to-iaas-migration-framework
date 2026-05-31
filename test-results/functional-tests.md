# FaaS

curl -s -H "x-api-key: [API_KEY_REDACTED]" https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/admin/store/store-001

Devuelve
[{"address":"123 Main St, Ciudad Principal","id":"store-001","name":"Tienda Principal","value":"main"}]


# IaaS

curl -s -H "x-api-key: [IAAS_API_KEY_REDACTED]" http://[IP_REDACTED]:3000/api/v1/admin/store/store-001

[{"id":"store-001","value":"main","name":"Tienda Principal","address":"123 Main St, Ciudad Principal","status":"active","createdAt":"2026-05-12T22:50:52.348Z","updatedAt":"2026-05-12T22:50:52.348Z"}]