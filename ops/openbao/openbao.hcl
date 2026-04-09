ui = true
disable_mlock = true

api_addr = "http://openbao:8200"
cluster_addr = "http://openbao:8201"

listener "tcp" {
  address = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_disable = 1
}

storage "raft" {
  path = "/openbao/data/raft"
  node_id = "openbao-1"
}

seal "static" {
  current_key_id = "local-auto-unseal"
  current_key = "file:///openbao/bootstrap/static-seal.key"
}
