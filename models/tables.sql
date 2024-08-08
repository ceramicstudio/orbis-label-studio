-- LIST accountRelation
table labeled_data {
  /*do not manually add*/ stream_id text -- The stream id of the post - auto-generated (do not define when creating table)
  /*do not manually add*/ controller text -- The DID controller of the post - auto-generated (do not define when creating table)
  id number
  uid number
  stars number
  url text
  type text
  review text
  filename text
  annotator number
  lead_time number
  sentiment text
  created_at timestamp
  updated_at timestamp
  annotation_id number
}

