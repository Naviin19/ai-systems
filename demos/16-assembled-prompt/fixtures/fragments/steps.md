## STEP EXECUTION PLAN
### Phase 1: Read the inputs
### Step 1.1: Read the product specification
Read product-spec.md end to end. List every data source it names.
### Step 1.2: Read the upstream handoff
Read the foundation agent's handoff.json. Note each field you will consume.
### Step 1.3: Check the schema
Load structured-output-schemas.md §2 and confirm the collection payload's shape.
### Phase 2: Collect
### Step 2.1: Open each source
For each source, record its base URL, its auth method and its rate limit.
### Step 2.2: Page through results
Follow api-integration-patterns.md §3. Stop at the page limit the specification sets.
### Step 2.3: Confirm the data source
**STOP.** Call `request_steering`: confirm which data source the subscriber picked.
### Step 2.4: Normalise
Map every record to the collection payload. A missing field stays null with a reason.
### Phase 3: Hand off
### Step 3.1: Write the files
Write collection.json and collection-notes.md, and nothing else.
### Step 3.2: Emit
Emit COLLECTION_TO_ANALYSIS with both files listed in artifacts_written.
