import { describe, it, expect, jest } from '@jest/globals';
import {
  CUSTOMER_SEED_DATA,
  seedCustomersAndAddresses,
  SeededCustomer,
} from '../../prisma/seed_modules/customers';
import { PrismaClient, UserStatus, AddressType } from '@prisma/client';

describe('Customer & Address Seed Module Unit Tests', () => {
  const expectedNames = [
    'Nguyễn Văn An',
    'Trần Thị Mai',
    'Lê Quốc Bảo',
    'Phạm Thị Lan',
    'Hoàng Minh Đức',
    'Vũ Ngọc Hân',
    'Đặng Thành Long',
    'Bùi Thu Trang',
    'Đỗ Hữu Phước',
    'Hồ Khánh Linh',
    'Ngô Tuấn Kiệt',
    'Dương Thanh Trúc',
    'Lý Minh Quân',
    'Đinh Diễm My',
    'Đoàn Gia Huy',
    'Lâm Ánh Tuyết',
    'Trịnh Đức Trọng',
    'Mai Hương Giang',
    'Phan Trọng Hiếu',
    'Võ Bảo Ngọc',
    'Cao Thế Vinh',
    'Lương Phương Thảo',
    'Hà Việt Hoàng',
    'Tạ Tuyết Mai',
    'Thái Đình Phong',
    'Tô Mỹ Duyên',
    'Kiều Quang Khải',
    'Ân Ngọc Bích',
    'Châu Duy Mạnh',
    'Hứa Thảo Nhi',
    'Nguyễn Văn Nam',
    'Lê Kim Oanh',
    'Trần Hoàng Long',
    'Phạm Thu Cúc',
    'Huỳnh Đăng Khoa',
    'Dương Bích Trâm',
    'Võ Nhật Minh',
    'Bùi Yến Nhi',
    'Đỗ Hải Đăng',
    'Nguyễn Khánh Vy',
  ];

  it('should have exactly 40 seeded customer datasets matching expected Vietnamese names', () => {
    expect(CUSTOMER_SEED_DATA).toHaveLength(40);

    const actualNames = CUSTOMER_SEED_DATA.map(
      (c) => `${c.lastName} ${c.firstName}`,
    );
    expect(actualNames).toEqual(expectedNames);
  });

  it('should have unique, valid emails for all 40 customers', () => {
    const emails = CUSTOMER_SEED_DATA.map((c) => c.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toBe(40);

    for (const email of emails) {
      expect(email).toMatch(/^[a-z0-9.]+@[a-z0-9.]+\.[a-z]{2,}$/i);
    }
  });

  it('should have 40 unique 10-digit phones ranging from 0901234501 to 0901234540', () => {
    const phones = CUSTOMER_SEED_DATA.map((c) => c.phone);
    const uniquePhones = new Set(phones);
    expect(uniquePhones.size).toBe(40);

    for (let i = 1; i <= 40; i++) {
      const expectedPhone = `09012345${i.toString().padStart(2, '0')}`;
      expect(phones[i - 1]).toBe(expectedPhone);
    }
  });

  it('should cover all required provinces and districts across Vietnam', () => {
    const allDistricts = new Set<string>();
    const allCities = new Set<string>();

    for (const c of CUSTOMER_SEED_DATA) {
      allDistricts.add(c.homeAddress.district);
      allCities.add(c.homeAddress.city);
      if (c.workAddress) {
        allDistricts.add(c.workAddress.district);
        allCities.add(c.workAddress.city);
      }
    }

    // TP. Hồ Chí Minh (Quận 1, Quận 3, Bình Thạnh, Gò Vấp, Tân Bình, TP. Thủ Đức)
    expect(allCities.has('TP. Hồ Chí Minh')).toBe(true);
    expect(allDistricts.has('Quận 1')).toBe(true);
    expect(allDistricts.has('Quận 3')).toBe(true);
    expect(allDistricts.has('Bình Thạnh')).toBe(true);
    expect(allDistricts.has('Gò Vấp')).toBe(true);
    expect(allDistricts.has('Tân Bình')).toBe(true);
    expect(allDistricts.has('TP. Thủ Đức')).toBe(true);

    // Hà Nội (Quận Hoàn Kiếm, Cầu Giấy, Đống Đa, Hai Bà Trưng, Ba Đình)
    expect(allCities.has('Hà Nội')).toBe(true);
    expect(allDistricts.has('Quận Hoàn Kiếm')).toBe(true);
    expect(allDistricts.has('Quận Cầu Giấy')).toBe(true);
    expect(allDistricts.has('Quận Đống Đa')).toBe(true);
    expect(allDistricts.has('Quận Hai Bà Trưng')).toBe(true);
    expect(allDistricts.has('Quận Ba Đình')).toBe(true);

    // Đà Nẵng (Quận Hải Châu, Sơn Trà)
    expect(allCities.has('Đà Nẵng')).toBe(true);
    expect(allDistricts.has('Quận Hải Châu')).toBe(true);
    expect(allDistricts.has('Quận Sơn Trà')).toBe(true);

    // Cần Thơ (Quận Ninh Kiều)
    expect(allCities.has('Cần Thơ')).toBe(true);
    expect(allDistricts.has('Quận Ninh Kiều')).toBe(true);

    // Hải Phòng (Quận Lê Chân, Ngô Quyền)
    expect(allCities.has('Hải Phòng')).toBe(true);
    expect(allDistricts.has('Quận Lê Chân')).toBe(true);
    expect(allDistricts.has('Quận Ngô Quyền')).toBe(true);

    // Bình Dương (TP. Thủ Dầu Một, TP. Thuận An)
    expect(allCities.has('Bình Dương')).toBe(true);
    expect(allDistricts.has('TP. Thủ Dầu Một')).toBe(true);
    expect(allDistricts.has('TP. Thuận An')).toBe(true);
  });

  it('should have WORK addresses for about half of the customers (20 out of 40)', () => {
    const customersWithWork = CUSTOMER_SEED_DATA.filter((c) => !!c.workAddress);
    expect(customersWithWork).toHaveLength(20);
  });

  it('should successfully seed all 40 customers and their addresses via Prisma mock', async () => {
    let userCounter = 0;
    let addressCounter = 0;

    const upsertUserMock = jest.fn().mockImplementation((args: any) => {
      userCounter++;
      return Promise.resolve({
        id: `user-uuid-${userCounter}`,
        email: args.create.email,
        firstName: args.create.firstName,
        lastName: args.create.lastName,
        phone: args.create.phone,
        status: args.create.status,
        emailVerified: args.create.emailVerified,
        phoneVerified: args.create.phoneVerified,
      });
    });

    const upsertUserRoleMock = jest.fn().mockImplementation((args: any) => {
      return Promise.resolve({
        userId: args.create.userId,
        roleId: args.create.roleId,
      });
    });

    const findFirstAddressMock = jest.fn().mockImplementation(() => Promise.resolve(null));

    const createAddressMock = jest.fn().mockImplementation((args: any) => {
      addressCounter++;
      return Promise.resolve({
        id: `address-uuid-${addressCounter}`,
        ...args.data,
      });
    });

    const updateAddressMock = jest.fn().mockImplementation((args: any) => {
      return Promise.resolve({
        id: args.where.id,
        ...args.data,
      });
    });

    const prismaMock = {
      user: {
        upsert: upsertUserMock,
      },
      userRole: {
        upsert: upsertUserRoleMock,
      },
      address: {
        findFirst: findFirstAddressMock,
        create: createAddressMock,
        update: updateAddressMock,
      },
    } as unknown as PrismaClient;

    const dummyRoleId = 'role-user-12345';
    const dummyPasswordHash = '$2b$10$hashedCustomerPass';

    const results: SeededCustomer[] = await seedCustomersAndAddresses(
      prismaMock,
      dummyRoleId,
      dummyPasswordHash,
    );

    expect(results).toHaveLength(40);
    expect(upsertUserMock).toHaveBeenCalledTimes(40);
    expect(upsertUserRoleMock).toHaveBeenCalledTimes(40);

    // 40 HOME addresses + 20 WORK addresses = 60 address creations
    expect(createAddressMock).toHaveBeenCalledTimes(60);

    // Verify first result
    expect(results[0]).toEqual({
      id: 'user-uuid-1',
      email: 'an.nguyen92@gmail.com',
      firstName: 'An',
      lastName: 'Nguyễn Văn',
      phone: '0901234501',
      addressId: 'address-uuid-1',
    });

    // Verify that primary address is HOME and isDefault: true
    const firstHomeCall = (createAddressMock as any).mock.calls[0][0];
    expect(firstHomeCall.data.type).toBe(AddressType.HOME);
    expect(firstHomeCall.data.isDefault).toBe(true);
    expect(firstHomeCall.data.userId).toBe('user-uuid-1');

    // Verify work address was created with type WORK and isDefault: false
    const firstWorkCall = (createAddressMock as any).mock.calls[1][0];
    expect(firstWorkCall.data.type).toBe(AddressType.WORK);
    expect(firstWorkCall.data.isDefault).toBe(false);
    expect(firstWorkCall.data.userId).toBe('user-uuid-1');
  });
});
