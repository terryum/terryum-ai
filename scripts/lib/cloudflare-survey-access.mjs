const API = 'https://api.cloudflare.com/client/v4';

export function accessPlan({ projectExists, application, policies }) {
  const names = new Set((policies ?? []).map((policy) => policy.name));
  return {
    createProject: !projectExists,
    createApplication: !application,
    createAdminPolicy: !names.has('terryum-admin'),
    createServicePolicy: !names.has('terryum-service-token'),
  };
}

function policyMatches(policy, decision, selector, expectedValue) {
  if (!policy || policy.decision !== decision) return false;
  return (policy.include ?? []).some((rule) => rule?.[selector] && Object.values(rule[selector]).includes(expectedValue));
}

function verifyNamedPolicies(policies, adminEmail, serviceTokenId) {
  const admin = policies.find((policy) => policy.name === 'terryum-admin');
  const service = policies.find((policy) => policy.name === 'terryum-service-token');
  if (admin && !policyMatches(admin, 'allow', 'email', adminEmail)) throw new Error('existing terryum-admin policy does not match the configured admin identity');
  if (service && !policyMatches(service, 'non_identity', 'service_token', serviceTokenId)) throw new Error('existing terryum-service-token policy does not match the configured service token');
}

function cleanErrors(payload) {
  return (payload?.errors ?? []).map((error) => ({ code: error.code, message: error.message }));
}

async function cloudflare(path, { method = 'GET', body, token }) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(`Cloudflare API ${method} ${path} failed (${response.status})`);
    error.details = cleanErrors(payload);
    error.status = response.status;
    throw error;
  }
  return payload.result;
}

async function maybeCloudflare(path, options) {
  try {
    return await cloudflare(path, options);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function provisionSurveyPreview({ accountId, apiToken, project, hostname, adminEmail, serviceTokenId, dryRun = false }) {
  let pagesProject = await maybeCloudflare(`/accounts/${accountId}/pages/projects/${encodeURIComponent(project)}`, { token: apiToken });
  const applications = await cloudflare(`/accounts/${accountId}/access/apps?per_page=1000`, { token: apiToken });
  let application = applications.find((item) => item.domain === hostname || item.destinations?.some((destination) => destination.uri === hostname));
  let policies = application
    ? await cloudflare(`/accounts/${accountId}/access/apps/${application.id}/policies?per_page=1000`, { token: apiToken })
    : [];
  verifyNamedPolicies(policies, adminEmail, serviceTokenId);
  const plan = accessPlan({ projectExists: Boolean(pagesProject), application, policies });
  if (dryRun) return { plan, status: 'planned' };

  if (plan.createProject) {
    pagesProject = await cloudflare(`/accounts/${accountId}/pages/projects`, {
      method: 'POST', token: apiToken, body: { name: project, production_branch: 'main' },
    });
  }
  if (plan.createApplication) {
    application = await cloudflare(`/accounts/${accountId}/access/apps`, {
      method: 'POST', token: apiToken, body: {
        name: `Survey preview: ${project}`,
        domain: hostname,
        destinations: [{ type: 'public', uri: hostname }],
        type: 'self_hosted',
        session_duration: '24h',
        auto_redirect_to_identity: false,
      },
    });
    policies = [];
  }
  if (plan.createAdminPolicy) {
    await cloudflare(`/accounts/${accountId}/access/apps/${application.id}/policies`, {
      method: 'POST', token: apiToken, body: {
        name: 'terryum-admin', decision: 'allow', precedence: 1,
        include: [{ email: { email: adminEmail } }],
      },
    });
  }
  if (plan.createServicePolicy) {
    await cloudflare(`/accounts/${accountId}/access/apps/${application.id}/policies`, {
      method: 'POST', token: apiToken, body: {
        name: 'terryum-service-token', decision: 'non_identity', precedence: 2,
        include: [{ service_token: { token_id: serviceTokenId } }],
      },
    });
  }

  const verifiedApplications = await cloudflare(`/accounts/${accountId}/access/apps?per_page=1000`, { token: apiToken });
  const verified = verifiedApplications.find((item) => item.domain === hostname || item.destinations?.some((destination) => destination.uri === hostname));
  if (!verified) throw new Error('Access application verification failed');
  const verifiedPolicies = await cloudflare(`/accounts/${accountId}/access/apps/${verified.id}/policies?per_page=1000`, { token: apiToken });
  verifyNamedPolicies(verifiedPolicies, adminEmail, serviceTokenId);
  const secondPlan = accessPlan({ projectExists: Boolean(pagesProject), application: verified, policies: verifiedPolicies });
  if (Object.values(secondPlan).some(Boolean)) throw new Error('Access policy verification failed');
  return { plan, status: 'verified', hostname };
}
