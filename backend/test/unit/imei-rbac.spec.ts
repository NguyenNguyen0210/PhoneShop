import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';
import { ImeiController } from '../../src/modules/imei/imei.controller';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';
import { Role } from '../../src/common/enums/role.enum';

describe('ImeiController RBAC Permissions', () => {
  it('findAll should allow STAFF, MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.findAll);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('import should allow STAFF, MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.import);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('sell should remain restricted to MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.markSold);
    expect(roles).toBeDefined();
    expect(roles).not.toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('block should remain restricted to MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.block);
    expect(roles).toBeDefined();
    expect(roles).not.toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });
});
