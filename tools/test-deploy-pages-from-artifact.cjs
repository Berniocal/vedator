const assert = require('node:assert/strict');
const test = require('node:test');
const deploy = require('./deploy-pages-from-artifact.cjs');
function fixture({missing = 0, artifact = {}, statuses = ['queued', 'succeed']} = {}) {
  const calls = [], outputs = {};
  let reads = 0, polls = 0;
  const args = {
    artifactId: '123', buildVersion: 'a'.repeat(40),
    context: {repo: {owner: 'Berniocal', repo: 'vedator'}, runId: 456},
    core: {info() {}, getIDToken: async () => 'test-oidc', setOutput: (k, v) => outputs[k] = v},
    wait: async () => {}, artifactAttempts: 3, statusAttempts: 3,
    github: {
      rest: {actions: {getArtifact: async request => {
        calls.push(['artifact', request]);
        if (reads++ < missing) throw Object.assign(new Error('Not yet visible'), {status: 404});
        return {data: {id: 123, name: 'github-pages', expired: false,
          workflow_run: {id: 456}, size_in_bytes: 1024, ...artifact}};
      }}},
      request: async (route, request) => {
        calls.push([route, request]);
        if (route === 'POST /repos/{owner}/{repo}/pages/deployments')
          return {data: {id: 'deployment-1', page_url: 'https://bernio.cz/vedator/'}};
        if (route.endsWith('/cancel')) return {data: {}};
        return {data: {status: statuses[Math.min(polls++, statuses.length - 1)]}};
      }
    }
  };
  return {args, calls, outputs};
}
test('waits for the exact upload receipt, authorizes once and waits for publication', async () => {
  const f = fixture({missing: 1});
  assert.equal((await deploy(f.args)).page_url, 'https://bernio.cz/vedator/');
  assert.equal(f.calls.filter(([name]) => name === 'artifact').length, 2);
  const posts = f.calls.filter(([name]) => name === 'POST /repos/{owner}/{repo}/pages/deployments');
  assert.equal(posts.length, 1);
  assert.equal(posts[0][1].artifact_id, 123);
  assert.equal(posts[0][1].oidc_token, 'test-oidc');
  assert.equal(posts[0][1].pages_build_version, 'a'.repeat(40));
  assert.equal(f.outputs.status, 'succeed');
});
test('does not publish an artifact from another run or an expired upload', async () => {
  for (const artifact of [{workflow_run: {id: 999}}, {expired: true}, {name: 'other'}]) {
    const f = fixture({artifact});
    await assert.rejects(deploy(f.args));
    assert(!f.calls.some(([name]) => name.startsWith('POST')));
  }
});
test('does not report success after a failed Pages deployment', async () => {
  const f = fixture({statuses: ['deployment_failed']});
  await assert.rejects(deploy(f.args), /deployment_failed/);
  assert.equal(f.outputs.status, undefined);
});
test('cancels a deployment that never reaches a terminal state', async () => {
  const f = fixture({statuses: ['queued']});
  await assert.rejects(deploy(f.args), /timed out/);
  assert(f.calls.some(([name]) => name.endsWith('/cancel')));
  assert.equal(f.outputs.status, undefined);
});
