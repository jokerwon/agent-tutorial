```shell
docker-compose up -d
docker-compose down
```

```shell
PUT /article
{
    "mappings": {
        "properties": {
            "title": {
                "type": "text"
            },
            "content": {
                "type": "text"
            },
            "author": {
                "type": "keyword"
            },
            "createTime": {
                "type": "date"
            },
            "viewCount": {
                "type": "integer"
            }
        }
    }
}

GET /article/_mapping
GET /article/_settings

GET /article/_search
{
  "query": {
    "match_all": {}
  }
}

GET /article/_search
{
    "query": {
        "match": {
          "content": "RAG 向量 检索"
        }
    }
}


POST /article/_doc
{
  "title": "Elasticsearch 全文检索入门",
  "content": "ES 基于倒排索引与 BM25 实现全文搜索，适用于文本检索场景",
  "author": "后端开发",
  "createTime": "2026-04-26",
  "viewCount": 128
}

POST /_analyze
{
    "analyzer": "ik_max_word",
    "text": "Elasticsearch RAG 混合检索知识库"
}

```
