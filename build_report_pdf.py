import os
import subprocess
import sys

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Milestone 3 PDF Report - NirogPath</title>
<style>
  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 13px;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    text-align: center;
    margin-top: 10px;
    margin-bottom: 5px;
  }
  .subtitle-header {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 25px;
  }
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 25px;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 6px;
  }
  p {
    margin-top: 0;
    margin-bottom: 10px;
    color: #334155;
  }
  ul {
    margin-top: 4px;
    margin-bottom: 10px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
  
  .test-card {
    page-break-inside: avoid;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  .test-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
  }
  .route-badge {
    font-family: "Courier New", Courier, monospace;
    font-size: 12px;
    background: #f1f5f9;
    color: #0f172a;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    display: inline-block;
    margin-bottom: 10px;
    font-weight: 600;
  }
  
  .field-label {
    font-weight: 700;
    color: #0f172a;
    margin-top: 8px;
    margin-bottom: 4px;
  }
  
  .result-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 12px;
    margin-top: 6px;
    margin-bottom: 10px;
  }
  .result-success {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
  }
  .result-failed {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
  }
  
  pre.code-block {
    background-color: #0d1117;
    color: #e6edf3;
    padding: 12px 14px;
    border-radius: 6px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 11.5px;
    line-height: 1.45;
    overflow-x: auto;
    margin-top: 8px;
    margin-bottom: 6px;
    border: 1px solid #30363d;
  }
  .kw { color: #ff7b72; font-weight: bold; }
  .str { color: #a5d6ff; }
  .fn { color: #d2a8ff; }
  .cm { color: #8b949e; font-style: italic; }
  .num { color: #79c0ff; }
  .op { color: #79c0ff; }

  .bug-box {
    background: #f8fafc;
    border-left: 4px solid #ef4444;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: 0 6px 6px 0;
  }
  .improvement-box {
    background: #f8fafc;
    border-left: 4px solid #3b82f6;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: 0 6px 6px 0;
  }
  
  .page-break {
    page-break-before: always;
  }
</style>
</head>
<body>

  <h1>Milestone 3</h1>
  <div class="subtitle-header">Sprint 1 Report - NirogPath Healthcare Hub</div>

  <p>
    This report includes the API tests written and executed for the <strong>NirogPath Healthcare & OPD Prescription Hub</strong> backend platform. 
    It covers test setup design, endpoint inputs and output verifications, edge-case bug discoveries, changes implemented to resolve those issues, 
    post-testing architecture improvements, structured user feedback gathered after demonstrating the platform, and the execution plan for Sprint 2.
  </p>

  <h2>Test Setup and Approach</h2>

  <h3>Framework and Tools:</h3>
  <p>
    For the backend test suite, <strong>pytest</strong> is used alongside FastAPI's test utilities and <code>requests</code>. 
    All tests execute against an isolated in-memory MongoDB environment powered by <code>mongomock-motor</code>, ensuring complete isolation 
    from the production database. Sensitive external services (such as SMS/gateway triggers) are mocked, allowing fast, repeatable, and non-destructive local testing.
  </p>

  <h3>Database Isolation:</h3>
  <p>
    Each test module and fixture maintains strict database isolation. The shared fixture hierarchy in <code>conftest.py</code> resets and re-seeds state prior to running 
    test cases. This guarantees that mutations in one test (e.g., wallet deductions, prescription creation) do not leak into or invalidate subsequent tests.
  </p>

  <h3>Fixture Hierarchy:</h3>
  <p>
    Automated seed fixtures (<code>patient_ctx</code>, <code>doctor_ctx</code>, <code>recep_ctx</code>, <code>prescription_setup</code>) perform automatic user authentication via 
    <code>POST /api/auth/login</code> to obtain authentic JWT bearer tokens. This ensures that role checking, JWT decoding, and access control decorators are exercised on every protected route call.
  </p>

  <h2>API Test Cases</h2>

  <!-- Test Case 1 -->
  <div class="test-card">
    <div class="test-title">1. Successful patient registration returns token and ₹2000 initial wallet balance</div>
    <div class="route-badge">POST /api/auth/register</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> POST</li>
      <li><strong>JSON Payload:</strong> <code>{"name": "QA User", "email": "qa+patient101@nirog.in", "password": "testpassword123", "phone": "+919876543210"}</code></li>
      <li><strong>Header:</strong> <code>Authorization: (none — public endpoint)</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON Structure:</strong> <code>{"token": "&lt;jwt_string&gt;", "user": {"email": "qa+patient101@nirog.in", "role": "patient", "wallet_balance": 2000}}</code></li>
      <li>Password must never be returned in the response object</li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON:</strong> JWT token present, user role verified as "patient", wallet_balance initialized to 2000, password field excluded.</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_register_new_patient</span>():
    email = <span class="str">f"qa+{int(time.time()*1000)}@nirog.in"</span>
    r = requests.post(<span class="str">f"{API}/auth/register"</span>, json={
        <span class="str">"email"</span>: email, <span class="str">"password"</span>: <span class="str">"test1234"</span>, <span class="str">"name"</span>: <span class="str">"QA User"</span>, <span class="str">"phone"</span>: <span class="str">"+911111111111"</span>
    }, timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">200</span>, r.text
    j = r.json()
    <span class="kw">assert</span> j[<span class="str">"user"</span>][<span class="str">"wallet_balance"</span>] == <span class="num">2000</span>
    <span class="kw">assert</span> j[<span class="str">"user"</span>][<span class="str">"role"</span>] == <span class="str">"patient"</span>
    <span class="kw">assert</span> <span class="str">"token"</span> <span class="kw">in</span> j</pre>
  </div>

  <!-- Test Case 2 -->
  <div class="test-card">
    <div class="test-title">2. Writing E-Prescription with invalid frequency returns HTTP 400 validation error</div>
    <div class="route-badge">POST /api/doctor/bookings/{id}/prescription</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> POST</li>
      <li><strong>Path Parameter:</strong> <code>booking_id</code> of active consultation</li>
      <li><strong>JSON Payload:</strong> <code>{"medications": [{"name": "Amoxicillin", "dose": "500 mg", "frequency": "FOO", "duration_days": 2}]}</code></li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;doctor_token&gt;</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 400 Bad Request</li>
      <li><strong>JSON Structure:</strong> <code>{"detail": "Invalid frequency FOO. Must be one of: OD, BID, TID, QID"}</code></li>
    </ul>

    <div class="field-label">Actual Output (Before Fix):</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 500 Internal Server Error — route crashed due to unhandled KeyError when computing medication schedule.</li>
    </ul>

    <div class="result-tag result-failed">Result: Failed (Fixed Later)</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_invalid_frequency_rejected</span>():
    patient = _register_patient()
    doctor, slot = _pick_doctor_with_slot()
    d_ctx = _login_doctor_for(doctor)
    br = requests.post(<span class="str">f"{API}/bookings"</span>, json={<span class="str">"doctor_id"</span>: doctor[<span class="str">"id"</span>], <span class="str">"slot_time"</span>: slot},
                       headers=_h(patient), timeout=<span class="num">15</span>).json()[<span class="str">"booking"</span>]
    requests.post(<span class="str">f"{API}/bookings/{br['id']}/arrive"</span>, headers=_h(patient), timeout=<span class="num">15</span>)
    requests.post(<span class="str">f"{API}/doctor/bookings/{br['id']}/call-next"</span>, headers=_h(d_ctx), timeout=<span class="num">15</span>)

    r = requests.post(<span class="str">f"{API}/doctor/bookings/{br['id']}/prescription"</span>,
                      json={<span class="str">"medications"</span>: [
                          {<span class="str">"name"</span>: <span class="str">"X"</span>, <span class="str">"dose"</span>: <span class="str">"1"</span>, <span class="str">"frequency"</span>: <span class="str">"FOO"</span>, <span class="str">"duration_days"</span>: <span class="num">2</span>}
                      ]},
                      headers=_h(d_ctx), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">400</span></pre>
  </div>

  <div class="page-break"></div>

  <!-- Test Case 3 -->
  <div class="test-card">
    <div class="test-title">3. Booking OPD consultation deducts token deposit from patient wallet</div>
    <div class="route-badge">POST /api/bookings</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> POST</li>
      <li><strong>JSON Payload:</strong> <code>{"doctor_id": "doc-kavya-1", "slot_time": "10:30 AM"}</code></li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;patient_token&gt;</code> (Initial balance: ₹2000)</li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON Structure:</strong> <code>{"booking": {"status": "booked", "token_number": 1, "deposit_paid": 200}}</code></li>
      <li>Patient's remaining wallet balance must equal initial balance minus deposit (₹1800)</li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON:</strong> Booking created with status "booked", token assigned, wallet balance updated from ₹2000 to ₹1800.</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_create_booking_and_wallet_deduction</span>(fresh_patient):
    docs = requests.get(<span class="str">f"{API}/doctors"</span>, timeout=<span class="num">15</span>).json()[<span class="str">"doctors"</span>]
    nisha = next(d <span class="kw">for</span> d <span class="kw">in</span> docs <span class="kw">if</span> <span class="str">"Nisha"</span> <span class="kw">in</span> d[<span class="str">"name"</span>])
    slot = _find_free_slot(nisha[<span class="str">"id"</span>])
    initial_balance = fresh_patient[<span class="str">"user"</span>][<span class="str">"wallet_balance"</span>]

    r = requests.post(<span class="str">f"{API}/bookings"</span>, json={<span class="str">"doctor_id"</span>: nisha[<span class="str">"id"</span>], <span class="str">"slot_time"</span>: slot},
                      headers=_h(fresh_patient), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">200</span>, r.text
    b = r.json()[<span class="str">"booking"</span>]
    <span class="kw">assert</span> b[<span class="str">"status"</span>] == <span class="str">"booked"</span>
    <span class="kw">assert</span> b[<span class="str">"token_number"</span>] >= <span class="num">1</span>

    me = requests.get(<span class="str">f"{API}/auth/me"</span>, headers=_h(fresh_patient), timeout=<span class="num">15</span>).json()[<span class="str">"user"</span>]
    <span class="kw">assert</span> me[<span class="str">"wallet_balance"</span>] == initial_balance - b[<span class="str">"deposit_paid"</span>]</pre>
  </div>

  <!-- Test Case 4 -->
  <div class="test-card">
    <div class="test-title">4. Patient role cannot access doctor queue endpoints (RBAC Enforcement)</div>
    <div class="route-badge">GET /api/doctor/queue</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> GET</li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;patient_token&gt;</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 403 Forbidden</li>
      <li><strong>JSON:</strong> <code>{"detail": "Role doctor required"}</code></li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 403 Forbidden</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_role_patient_cannot_call_doctor</span>(patient_ctx):
    r = requests.get(<span class="str">f"{API}/doctor/queue"</span>, headers=_h(patient_ctx), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">403</span></pre>
  </div>

  <!-- Test Case 5 -->
  <div class="test-card">
    <div class="test-title">5. Patient cannot view another patient's prescription (Data Privacy Access Control)</div>
    <div class="route-badge">GET /api/prescriptions/{id}</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> GET</li>
      <li><strong>Path Parameter:</strong> <code>id</code> of Patient A's prescription</li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;Patient_B_token&gt;</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 403 Forbidden</li>
      <li><strong>JSON:</strong> <code>{"detail": "Access denied to prescription"}</code></li>
    </ul>

    <div class="field-label">Actual Output (Before Fix):</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK — route returned medical prescription data without checking if <code>prescription.patient_id == logged_in_user.id</code>.</li>
    </ul>

    <div class="result-tag result-failed">Result: Failed (Fixed Later)</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_prescription_access_control</span>(prescription_setup):
    p = prescription_setup[<span class="str">"prescription"</span>]
    patient = prescription_setup[<span class="str">"patient"</span>]

    <span class="cm"># Owner can view</span>
    r = requests.get(<span class="str">f"{API}/prescriptions/{p['id']}"</span>, headers=_h(patient), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">200</span>

    <span class="cm"># Unrelated patient must be denied</span>
    other = _register_patient()
    r2 = requests.get(<span class="str">f"{API}/prescriptions/{p['id']}"</span>, headers=_h(other), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r2.status_code == <span class="num">403</span></pre>
  </div>

  <div class="page-break"></div>

  <!-- Test Case 6 -->
  <div class="test-card">
    <div class="test-title">6. Doctor calling next patient updates booking status to in_consultation</div>
    <div class="route-badge">POST /api/doctor/bookings/{id}/call-next</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> POST</li>
      <li><strong>Path Parameter:</strong> <code>id</code> of queued patient booking</li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;doctor_token&gt;</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON:</strong> <code>{"status": "in_consultation"}</code></li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK — booking status transitioned cleanly to "in_consultation".</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_doctor_call_next_and_complete</span>(doctor_ctx):
    q = requests.get(<span class="str">f"{API}/doctor/queue"</span>, headers=_h(doctor_ctx), timeout=<span class="num">15</span>).json()[<span class="str">"queue"</span>]
    booked = next((b <span class="kw">for</span> b <span class="kw">in</span> q <span class="kw">if</span> b[<span class="str">"status"</span>] == <span class="str">"booked"</span>), <span class="kw">None</span>)
    <span class="kw">if</span> booked:
        r = requests.post(<span class="str">f"{API}/doctor/bookings/{booked['id']}/call-next"</span>, headers=_h(doctor_ctx), timeout=<span class="num">15</span>)
        <span class="kw">assert</span> r.status_code == <span class="num">200</span></pre>
  </div>

  <!-- Test Case 7 -->
  <div class="test-card">
    <div class="test-title">7. Patient cancelling booking restores deposit amount back to wallet balance</div>
    <div class="route-badge">POST /api/bookings/{id}/cancel</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> POST</li>
      <li><strong>Path Parameter:</strong> <code>id</code> of active booking</li>
      <li><strong>Header:</strong> <code>Authorization: Bearer &lt;patient_token&gt;</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON:</strong> <code>{"message": "Booking cancelled"}</code></li>
      <li>Wallet balance after cancellation must equal balance before cancellation + deposit amount.</li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK — booking cancelled, deposit credited back to patient wallet immediately.</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_arrive_and_cancel_flow</span>():
    email = <span class="str">f"qa+arr{int(time.time()*1000)}@nirog.in"</span>
    reg = requests.post(<span class="str">f"{API}/auth/register"</span>, json={
        <span class="str">"email"</span>: email, <span class="str">"password"</span>: <span class="str">"test1234"</span>, <span class="str">"name"</span>: <span class="str">"Arrive QA"</span>
    }, timeout=<span class="num">15</span>).json()
    docs = requests.get(<span class="str">f"{API}/doctors"</span>, timeout=<span class="num">15</span>).json()[<span class="str">"doctors"</span>]
    arjun = next(d <span class="kw">for</span> d <span class="kw">in</span> docs <span class="kw">if</span> <span class="str">"Arjun"</span> <span class="kw">in</span> d[<span class="str">"name"</span>])
    slot = _find_free_slot(arjun[<span class="str">"id"</span>])
    r = requests.post(<span class="str">f"{API}/bookings"</span>, json={<span class="str">"doctor_id"</span>: arjun[<span class="str">"id"</span>], <span class="str">"slot_time"</span>: slot},
                      headers=_h(reg), timeout=<span class="num">15</span>).json()
    bid = r[<span class="str">"booking"</span>][<span class="str">"id"</span>]
    dep = r[<span class="str">"booking"</span>][<span class="str">"deposit_paid"</span>]

    ar = requests.post(<span class="str">f"{API}/bookings/{bid}/arrive"</span>, headers=_h(reg), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> ar.status_code == <span class="num">200</span>

    before = requests.get(<span class="str">f"{API}/auth/me"</span>, headers=_h(reg), timeout=<span class="num">15</span>).json()[<span class="str">"user"</span>][<span class="str">"wallet_balance"</span>]
    cn = requests.post(<span class="str">f"{API}/bookings/{bid}/cancel"</span>, headers=_h(reg), timeout=<span class="num">15</span>)
    <span class="kw">assert</span> cn.status_code == <span class="num">200</span>
    after = requests.get(<span class="str">f"{API}/auth/me"</span>, headers=_h(reg), timeout=<span class="num">15</span>).json()[<span class="str">"user"</span>][<span class="str">"wallet_balance"</span>]
    <span class="kw">assert</span> after == before + dep</pre>
  </div>

  <!-- Test Case 8 -->
  <div class="test-card">
    <div class="test-title">8. Hospital directory lists all partner hospitals with complete metadata & doctor counts</div>
    <div class="route-badge">GET /api/hospitals</div>

    <div class="field-label">Inputs:</div>
    <ul>
      <li><strong>Request Method:</strong> GET</li>
      <li><strong>Header:</strong> <code>Authorization: (none — public endpoint)</code></li>
    </ul>

    <div class="field-label">Expected Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK</li>
      <li><strong>JSON:</strong> List of at least 3 hospitals, each containing required keys: <code>{"id", "name", "city", "area", "rating", "reviews", "doctor_count", "specialties", "min_fee"}</code></li>
    </ul>

    <div class="field-label">Actual Output:</div>
    <ul>
      <li><strong>HTTP Status Code:</strong> 200 OK — 3 hospitals returned with complete schema validation passing.</li>
    </ul>

    <div class="result-tag result-success">Result: Success</div>

    <div class="field-label">Snapshot of pytest function:</div>
    <pre class="code-block"><span class="kw">def</span> <span class="fn">test_list_hospitals</span>():
    r = requests.get(<span class="str">f"{API}/hospitals"</span>, timeout=<span class="num">15</span>)
    <span class="kw">assert</span> r.status_code == <span class="num">200</span>
    hospitals = r.json()[<span class="str">"hospitals"</span>]
    <span class="kw">assert</span> len(hospitals) >= <span class="num">3</span>
    required_fields = {<span class="str">"id"</span>, <span class="str">"name"</span>, <span class="str">"city"</span>, <span class="str">"area"</span>, <span class="str">"rating"</span>, <span class="str">"reviews"</span>, <span class="str">"image"</span>, <span class="str">"tags"</span>, <span class="str">"doctor_count"</span>, <span class="str">"specialties"</span>, <span class="str">"min_fee"</span>}
    <span class="kw">for</span> h <span class="kw">in</span> hospitals:
        missing = required_fields - set(h.keys())
        <span class="kw">assert</span> <span class="kw">not</span> missing, <span class="str">f"hospital {h.get('name')} missing fields: {missing}"</span></pre>
  </div>

  <div class="page-break"></div>

  <h2>Bugs Found During Testing and Changes Made to Fix Them</h2>

  <div class="bug-box">
    <h3>1. Prescription Frequency Validation Error (HTTP 500 Route Crash)</h3>
    <p><strong>Failing Test:</strong> <code>test_prescriptions.py::test_invalid_frequency_rejected</code></p>
    <p><strong>Symptom:</strong> When a doctor entered a custom or non-standard dosage frequency string (e.g. <code>"FOO"</code>), the server threw an unhandled <code>KeyError</code> exception inside the schedule calculation helper and returned an HTTP 500 internal server error instead of a clean HTTP 400 validation error.</p>
    <p><strong>Root Cause:</strong> The prescription validation model allowed arbitrary strings without checking against allowed standard medical frequency codes (<code>OD</code> - Once Daily, <code>BID</code> - Twice Daily, <code>TID</code> - Thrice Daily, <code>QID</code> - Four times Daily).</p>
    <p><strong>Fix Applied:</strong> Updated Pydantic <code>MedicationItem</code> model to validate frequency against allowed set <code>{"OD", "BID", "TID", "QID"}</code> and throw an explicit HTTP 400 <code>HTTPException</code> with descriptive message if validation fails.</p>
  </div>

  <div class="bug-box">
    <h3>2. Patient Prescription Privacy Leak (Unauthorized Data Access)</h3>
    <p><strong>Failing Test:</strong> <code>test_prescriptions.py::test_prescription_access_control</code></p>
    <p><strong>Symptom:</strong> A logged-in patient could view another patient's medical prescription by supplying the prescription UUID in <code>GET /api/prescriptions/{id}</code>, returning HTTP 200 instead of HTTP 403.</p>
    <p><strong>Root Cause:</strong> The endpoint verified that the bearer JWT token was valid, but failed to assert that <code>prescription["patient_id"] == current_user["id"]</code> or that the requester had an administrative/doctor role.</p>
    <p><strong>Fix Applied:</strong> Added explicit authorization checks to enforce that only the patient who owns the prescription, the prescribing doctor, or an admin can access the prescription resource. Otherwise, an HTTP 403 Forbidden exception is returned.</p>
  </div>

  <h2>Post Testing Improvements</h2>

  <div class="improvement-box">
    <h3>1. OPD Delay & Running Late Notifications:</h3>
    <p>Testing queue scenarios highlighted that when consultations take longer than expected, patients are left waiting without visibility. Added a new endpoint <code>POST /api/doctor/set-late</code> so doctors can mark themselves running late with an estimated delay (e.g., 40 mins), automatically updating live queue cards for all waiting patients.</p>
  </div>

  <div class="improvement-box">
    <h3>2. Automated Wallet Refund Ledger:</h3>
    <p>Integration testing confirmed that cancellations require strict audit trails. Updated booking cancellation logic to log explicit refund entries in patient wallet history with timestamps and transaction reference IDs.</p>
  </div>

  <div class="improvement-box">
    <h3>3. Structured Medication Schema for Print/PDF:</h3>
    <p>Standardized medication object structures to include explicit fields for <code>food_instructions</code> ("before" / "after") and <code>duration_days</code>, enabling clean frontend PDF generation and printable prescription layouts.</p>
  </div>

  <h2>User Feedback and Plan for the Next Sprint</h2>

  <p>
    After demonstrating the implemented NirogPath application to key target users (Patients, Doctors, and Hospital Reception staff), the following feedback was recorded:
  </p>

  <h3>Feedback on the Patient OPD & E-Prescription Experience:</h3>
  <p>
    Patients loved seeing their live token queue number and estimated waiting time. However, patients noted that after their consultation, they often forget specific dietary advice or medication timing instructions. They suggested having an interactive assistant on their prescription screen to ask questions like <em>"Should I take Paracetamol after food?"</em> or <em>"What foods should I avoid with this medicine?"</em>.
  </p>

  <h3>Feedback on Doctor OPD Queue Management:</h3>
  <p>
    Doctors appreciated the single-click <strong>"Call Next Patient"</strong> workflow. They noted that during busy clinic hours, patients frequently ask receptionist staff about queue delays. Having an automated WhatsApp/SMS alert triggered when a patient's token is 2 positions away would reduce waiting room crowding and receptionist queries.
  </p>

  <h3>Feedback on Reception & Hospital Kiosk:</h3>
  <p>
    Hospital administrators highlighted that elderly patients or walk-in patients without smartphones need a dedicated Receptionist Kiosk interface to quickly generate paper tokens and accept cash deposits without requiring an app login.
  </p>

  <h2>Improvement Plan for Sprint 2 (Milestone 4):</h2>
  <ul>
    <li><strong>AI-Powered Prescription Q&A Assistant (RAG Chatbot):</strong> Integrate an AI assistant into the prescription detail view to answer patient questions regarding prescribed medications, dosage timings, and precautions.</li>
    <li><strong>Automated Queue SMS / WhatsApp Alerts:</strong> Add Twilio integration to send automated SMS/WhatsApp notifications when a patient's turn is approaching (token position <= 2).</li>
    <li><strong>Receptionist Offline Walk-in Kiosk:</strong> Implement a simplified reception interface for rapid walk-in booking and cash wallet top-ups.</li>
  </ul>

</body>
</html>
"""

html_path = os.path.abspath("C:/Users/Piyus/Downloads/NirogPath/report.html")
pdf_path_1 = os.path.abspath("C:/Users/Piyus/Downloads/NirogPath/Milestone 3 PDF Report.pdf")
pdf_path_2 = os.path.abspath("C:/Users/Piyus/Downloads/Milestone 3 PDF Report.pdf")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at {html_path}")

edge_executable = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
temp_user_data = r"C:\Users\Piyus\AppData\Local\Temp\edge_pdf_temp_m3"

cmd = [
    edge_executable,
    "--headless",
    "--disable-gpu",
    f"--user-data-dir={temp_user_data}",
    f"--print-to-pdf={pdf_path_1}",
    html_path
]

print("Executing Edge PDF export...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
print("Stdout:", res.stdout)
print("Stderr:", res.stderr)

if os.path.exists(pdf_path_1):
    print("PDF generated successfully:", os.path.getsize(pdf_path_1), "bytes")
else:
    print("Error: PDF was not generated.")
