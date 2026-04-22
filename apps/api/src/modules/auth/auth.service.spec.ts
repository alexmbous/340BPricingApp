import { buildOrganizationScope } from '../../common/tenancy/tenant-scope';
import { Roles } from '@apexcare/shared-types';

// Simple unit test that the guardrail helper doesn't regress silently.
describe('buildOrganizationScope', () => {
  const base = {
    userId: 'u1',
    email: 'x@y.z',
    jti: 'j',
    parentOrganizationId: null,
    organizationId: null,
  };

  it('super admin has no where clause', () => {
    expect(buildOrganizationScope({ ...base, role: Roles.SUPER_ADMIN })).toEqual({});
  });

  it('org admin filters by organizationId', () => {
    expect(
      buildOrganizationScope({ ...base, role: Roles.ORG_ADMIN, organizationId: 'o1' }),
    ).toEqual({ organizationId: 'o1' });
  });

  it('parent admin filters via parent chain', () => {
    expect(
      buildOrganizationScope({
        ...base,
        role: Roles.PARENT_ADMIN,
        parentOrganizationId: 'p1',
      }),
    ).toEqual({ organization: { parentOrganizationId: 'p1' } });
  });

  it('throws when parent admin has no parent org', () => {
    expect(() =>
      buildOrganizationScope({ ...base, role: Roles.PARENT_ADMIN }),
    ).toThrow();
  });
});
