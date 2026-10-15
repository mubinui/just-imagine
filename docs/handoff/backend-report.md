# Gateway and builder work in progress

Gateway: authenticated Firebase ownership and cross-instance session lock, binary PCM relay, in-memory transcript summaries, model tools, pacing/quota, handoff/resumption, Firestore milestone watch, CloudTasks builder enqueue, Vertex ADC adapters. Five tests pass (four actual WebSocket lifecycle tests plus pacing); typecheck passes. SDK typechecked against installed @google/genai1.52.0. No realmodelcalls. Main productionenv requires project,WEB_URL,BUILDER_URL,TASK_SERVICE_ACCOUNT. ModelIDs default specvalues butavailability unverified.

Builder: generatedscene validation+one repair, atomic validatedpatch, Firestore leases/idempotency/progressive publication, safeimagegate, chromakey/trim/pad/WebP, convexoutline cache,GCS. Five unit tests pass, typecheck passed. Genkit flow with actual VertexSDK in worker (not Genkit modelplugin). OIDC job endpoint checks audience+serviceaccount. Worker integration/emulator tests pending. Asset collisionoutline currentlyconvexenvelope, notfullconcavedecomposition; failedassets remainplaceholder. Realcloudlatency/capacity unverified.

API fixes: durable deletionJobs with deletionLocks fences sharedwithgateway/builder,CloudTasksdispatch plus internalOIDCworker/maintenanceendpoint, retriesindependentofuserdoc; billingserializedlease,reusedpendingCheckout, allprovidercancellations,currentproviderstateinsidelease. Twelve tests pass underemulators. Need regressionconcurrencybilling andrereview.

Requestedreview: lifecyclefailurecleanup, concurrency,idempotency,ownership,runtimepayloadlimits, importantdeadlines. Changes may be needed. No component claimedreleasecomplete.
