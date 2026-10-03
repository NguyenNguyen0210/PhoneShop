import { PrismaClient, UserStatus, AddressType } from '@prisma/client';

export interface SeededCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressId: string;
}

export interface AddressTemplate {
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface CustomerSeedData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  homeAddress: AddressTemplate;
  workAddress?: AddressTemplate;
}

export const CUSTOMER_SEED_DATA: CustomerSeedData[] = [
  // Customers 1 - 10
  {
    lastName: 'Nguyễn Văn',
    firstName: 'An',
    email: 'an.nguyen92@gmail.com',
    phone: '0901234501',
    homeAddress: {
      addressLine1: '123 Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Bitexco Financial Tower, Tầng 15, 2 Hải Triều',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Trần Thị',
    firstName: 'Mai',
    email: 'mai.tran88@gmail.com',
    phone: '0901234502',
    homeAddress: {
      addressLine1: '250 Nguyễn Thị Minh Khai',
      ward: 'Võ Thị Sáu',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Lê Quốc',
    firstName: 'Bảo',
    email: 'bao.lequoc95@gmail.com',
    phone: '0901234503',
    homeAddress: {
      addressLine1: '208 Nguyễn Hữu Cảnh',
      ward: 'Phường 22',
      district: 'Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Landmark 81, Tầng 28, 720A Điện Biên Phủ',
      ward: 'Phường 22',
      district: 'Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Phạm Thị',
    firstName: 'Lan',
    email: 'lan.phamthi90@gmail.com',
    phone: '0901234504',
    homeAddress: {
      addressLine1: '320 Quang Trung',
      ward: 'Phường 10',
      district: 'Gò Vấp',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Hoàng Minh',
    firstName: 'Đức',
    email: 'duc.hoangminh94@gmail.com',
    phone: '0901234505',
    homeAddress: {
      addressLine1: '102 Trường Chinh',
      ward: 'Phường 12',
      district: 'Tân Bình',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà TTC, 253 Hoàng Văn Thụ',
      ward: 'Phường 2',
      district: 'Tân Bình',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Vũ Ngọc',
    firstName: 'Hân',
    email: 'han.vungoc97@gmail.com',
    phone: '0901234506',
    homeAddress: {
      addressLine1: '15 Võ Văn Ngân',
      ward: 'Linh Chiểu',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Đặng Thành',
    firstName: 'Long',
    email: 'long.dangthanh91@gmail.com',
    phone: '0901234507',
    homeAddress: {
      addressLine1: '24 Tràng Tiền',
      ward: 'Tràng Tiền',
      district: 'Quận Hoàn Kiếm',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Sun Red River, 23 Phan Chu Trinh',
      ward: 'Phan Chu Trinh',
      district: 'Quận Hoàn Kiếm',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Bùi Thu',
    firstName: 'Trang',
    email: 'trang.buithu96@gmail.com',
    phone: '0901234508',
    homeAddress: {
      addressLine1: '144 Xuân Thủy',
      ward: 'Dịch Vọng Hậu',
      district: 'Quận Cầu Giấy',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Đỗ Hữu',
    firstName: 'Phước',
    email: 'phuoc.dohuu89@gmail.com',
    phone: '0901234509',
    homeAddress: {
      addressLine1: '98 Thái Hà',
      ward: 'Trung Liệt',
      district: 'Quận Đống Đa',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà VPBank, 89 Láng Hạ',
      ward: 'Láng Hạ',
      district: 'Quận Đống Đa',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Hồ Khánh',
    firstName: 'Linh',
    email: 'linh.hokhanh98@gmail.com',
    phone: '0901234510',
    homeAddress: {
      addressLine1: '458 Minh Khai, Tòa Park 3 Times City',
      ward: 'Vĩnh Tuy',
      district: 'Quận Hai Bà Trưng',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  // Customers 11 - 20
  {
    lastName: 'Ngô Tuấn',
    firstName: 'Kiệt',
    email: 'kiet.ngotuan93@gmail.com',
    phone: '0901234511',
    homeAddress: {
      addressLine1: '54 Liễu Giai',
      ward: 'Cống Vị',
      district: 'Quận Ba Đình',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Lotte Center Hà Nội, Tầng 21, 54 Liễu Giai',
      ward: 'Cống Vị',
      district: 'Quận Ba Đình',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Dương Thanh',
    firstName: 'Trúc',
    email: 'truc.duongthanh95@gmail.com',
    phone: '0901234512',
    homeAddress: {
      addressLine1: '180 Bạch Đằng',
      ward: 'Hải Châu 1',
      district: 'Quận Hải Châu',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
  },
  {
    lastName: 'Lý Minh',
    firstName: 'Quân',
    email: 'quan.lyminh92@gmail.com',
    phone: '0901234513',
    homeAddress: {
      addressLine1: '45 Võ Văn Kiệt',
      ward: 'Phước Mỹ',
      district: 'Quận Sơn Trà',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Indochina Riverside, Tầng 8, 74 Bạch Đằng',
      ward: 'Hải Châu 1',
      district: 'Quận Hải Châu',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
  },
  {
    lastName: 'Đinh Diễm',
    firstName: 'My',
    email: 'my.dinhdiem97@gmail.com',
    phone: '0901234514',
    homeAddress: {
      addressLine1: '30 Đại lộ Hòa Bình',
      ward: 'An Cư',
      district: 'Quận Ninh Kiều',
      city: 'Cần Thơ',
      province: 'Cần Thơ',
      postalCode: '900000',
    },
  },
  {
    lastName: 'Đoàn Gia',
    firstName: 'Huy',
    email: 'huy.doangia99@gmail.com',
    phone: '0901234515',
    homeAddress: {
      addressLine1: '1 Hai Bà Trưng',
      ward: 'Tân An',
      district: 'Quận Ninh Kiều',
      city: 'Cần Thơ',
      province: 'Cần Thơ',
      postalCode: '900000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Vincom Plaza Hùng Vương, 2 Hùng Vương',
      ward: 'Thới Bình',
      district: 'Quận Ninh Kiều',
      city: 'Cần Thơ',
      province: 'Cần Thơ',
      postalCode: '900000',
    },
  },
  {
    lastName: 'Lâm Ánh',
    firstName: 'Tuyết',
    email: 'tuyet.lamanh94@gmail.com',
    phone: '0901234516',
    homeAddress: {
      addressLine1: '10 Võ Nguyên Giáp',
      ward: 'Kênh Dương',
      district: 'Quận Lê Chân',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
  },
  {
    lastName: 'Trịnh Đức',
    firstName: 'Trọng',
    email: 'trong.trinhduc91@gmail.com',
    phone: '0901234517',
    homeAddress: {
      addressLine1: '104 Lạch Tray',
      ward: 'Lạch Tray',
      district: 'Quận Ngô Quyền',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà TD Plaza, Lô 20A Lê Hồng Phong',
      ward: 'Đông Khê',
      district: 'Quận Ngô Quyền',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
  },
  {
    lastName: 'Mai Hương',
    firstName: 'Giang',
    email: 'giang.maihuong96@gmail.com',
    phone: '0901234518',
    homeAddress: {
      addressLine1: '230 Đại lộ Bình Dương',
      ward: 'Phú Hòa',
      district: 'TP. Thủ Dầu Một',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
  },
  {
    lastName: 'Phan Trọng',
    firstName: 'Hiếu',
    email: 'hieu.phantrong93@gmail.com',
    phone: '0901234519',
    homeAddress: {
      addressLine1: '01 Đại lộ Bình Dương, Khu phố Bình Đức 2',
      ward: 'Lái Thiêu',
      district: 'TP. Thuận An',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Becamex Tower, Tầng 12, 230 Đại lộ Bình Dương',
      ward: 'Phú Hòa',
      district: 'TP. Thủ Dầu Một',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
  },
  {
    lastName: 'Võ Bảo',
    firstName: 'Ngọc',
    email: 'ngoc.vobao98@gmail.com',
    phone: '0901234520',
    homeAddress: {
      addressLine1: '180 Hai Bà Trưng',
      ward: 'Đa Kao',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  // Customers 21 - 30
  {
    lastName: 'Cao Thế',
    firstName: 'Vinh',
    email: 'vinh.caothe90@gmail.com',
    phone: '0901234521',
    homeAddress: {
      addressLine1: '88 Nam Kỳ Khởi Nghĩa',
      ward: 'Võ Thị Sáu',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Lim Tower 2, 158 Võ Văn Tần',
      ward: 'Võ Thị Sáu',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Lương Phương',
    firstName: 'Thảo',
    email: 'thao.luongphuong95@gmail.com',
    phone: '0901234522',
    homeAddress: {
      addressLine1: '48 Điện Biên Phủ',
      ward: 'Phường 15',
      district: 'Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Hà Việt',
    firstName: 'Hoàng',
    email: 'hoang.haviet94@gmail.com',
    phone: '0901234523',
    homeAddress: {
      addressLine1: '145 Phan Văn Trị',
      ward: 'Phường 7',
      district: 'Gò Vấp',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Khu đô thị Cityland Park Hills, 18 Phan Văn Trị',
      ward: 'Phường 10',
      district: 'Gò Vấp',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Tạ Tuyết',
    firstName: 'Mai',
    email: 'mai.tatuyet92@gmail.com',
    phone: '0901234524',
    homeAddress: {
      addressLine1: '60 Hoàng Văn Thụ',
      ward: 'Phường 4',
      district: 'Tân Bình',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Thái Đình',
    firstName: 'Phong',
    email: 'phong.thaidinh93@gmail.com',
    phone: '0901234525',
    homeAddress: {
      addressLine1: '88 Song Hành Xa Lộ Hà Nội',
      ward: 'An Phú',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà The Hallmark, Khu Đô Thị Mới Thủ Thiêm',
      ward: 'Thủ Thiêm',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Tô Mỹ',
    firstName: 'Duyên',
    email: 'duyen.tomy96@gmail.com',
    phone: '0901234526',
    homeAddress: {
      addressLine1: '58 Lý Thường Kiệt',
      ward: 'Trần Hưng Đạo',
      district: 'Quận Hoàn Kiếm',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Kiều Quang',
    firstName: 'Khải',
    email: 'khai.kieuquang91@gmail.com',
    phone: '0901234527',
    homeAddress: {
      addressLine1: '72 Trần Thái Tông',
      ward: 'Dịch Vọng Hậu',
      district: 'Quận Cầu Giấy',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà CMC Tower, Phố Duy Tân',
      ward: 'Dịch Vọng Hậu',
      district: 'Quận Cầu Giấy',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Ân Ngọc',
    firstName: 'Bích',
    email: 'bich.anngoc97@gmail.com',
    phone: '0901234528',
    homeAddress: {
      addressLine1: '185 Chùa Bộc',
      ward: 'Quang Trung',
      district: 'Quận Đống Đa',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Châu Duy',
    firstName: 'Mạnh',
    email: 'manh.chauduy90@gmail.com',
    phone: '0901234529',
    homeAddress: {
      addressLine1: '191 Bà Triệu',
      ward: 'Lê Đại Hành',
      district: 'Quận Hai Bà Trưng',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Vincom Center Bà Triệu, 191 Bà Triệu',
      ward: 'Lê Đại Hành',
      district: 'Quận Hai Bà Trưng',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  {
    lastName: 'Hứa Thảo',
    firstName: 'Nhi',
    email: 'nhi.huathao98@gmail.com',
    phone: '0901234530',
    homeAddress: {
      addressLine1: '29 Đội Cấn',
      ward: 'Đội Cấn',
      district: 'Quận Ba Đình',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
  // Customers 31 - 40
  {
    lastName: 'Nguyễn Văn',
    firstName: 'Nam',
    email: 'nam.nguyenvan92@gmail.com',
    phone: '0901234531',
    homeAddress: {
      addressLine1: '35 Nguyễn Văn Linh',
      ward: 'Nam Dương',
      district: 'Quận Hải Châu',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà FPT Complex Đà Nẵng, Đường Nam Kỳ Khởi Nghĩa',
      ward: 'Hòa Hải',
      district: 'Quận Ngũ Hành Sơn',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
  },
  {
    lastName: 'Lê Kim',
    firstName: 'Oanh',
    email: 'oanh.lekim95@gmail.com',
    phone: '0901234532',
    homeAddress: {
      addressLine1: '120 Phạm Văn Đồng',
      ward: 'An Hải Bắc',
      district: 'Quận Sơn Trà',
      city: 'Đà Nẵng',
      province: 'Đà Nẵng',
      postalCode: '550000',
    },
  },
  {
    lastName: 'Trần Hoàng',
    firstName: 'Long',
    email: 'long.tranhoang94@gmail.com',
    phone: '0901234533',
    homeAddress: {
      addressLine1: '78 Nguyễn Trãi',
      ward: 'An Hội',
      district: 'Quận Ninh Kiều',
      city: 'Cần Thơ',
      province: 'Cần Thơ',
      postalCode: '900000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà VNPT Cần Thơ, 2 Nguyễn Trãi',
      ward: 'An Hội',
      district: 'Quận Ninh Kiều',
      city: 'Cần Thơ',
      province: 'Cần Thơ',
      postalCode: '900000',
    },
  },
  {
    lastName: 'Phạm Thu',
    firstName: 'Cúc',
    email: 'cuc.phamthu91@gmail.com',
    phone: '0901234534',
    homeAddress: {
      addressLine1: '22 Tô Hiệu',
      ward: 'Trại Cau',
      district: 'Quận Lê Chân',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
  },
  {
    lastName: 'Huỳnh Đăng',
    firstName: 'Khoa',
    email: 'khoa.huynhdang93@gmail.com',
    phone: '0901234535',
    homeAddress: {
      addressLine1: '45 Lê Hồng Phong',
      ward: 'Đông Khê',
      district: 'Quận Ngô Quyền',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà DG Tower, 15 Trần Phú',
      ward: 'Lương Khánh Thiện',
      district: 'Quận Ngô Quyền',
      city: 'Hải Phòng',
      province: 'Hải Phòng',
      postalCode: '180000',
    },
  },
  {
    lastName: 'Dương Bích',
    firstName: 'Trâm',
    email: 'tram.duongbich97@gmail.com',
    phone: '0901234536',
    homeAddress: {
      addressLine1: '15 Yersin',
      ward: 'Hiệp Thành',
      district: 'TP. Thủ Dầu Một',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
  },
  {
    lastName: 'Võ Nhật',
    firstName: 'Minh',
    email: 'minh.vonhat96@gmail.com',
    phone: '0901234537',
    homeAddress: {
      addressLine1: '88 Nguyễn Trãi',
      ward: 'Lái Thiêu',
      district: 'TP. Thuận An',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà VSIP I Office Building, 8 Đại lộ Hữu Nghị',
      ward: 'Bình Hòa',
      district: 'TP. Thuận An',
      city: 'Bình Dương',
      province: 'Bình Dương',
      postalCode: '820000',
    },
  },
  {
    lastName: 'Bùi Yến',
    firstName: 'Nhi',
    email: 'nhi.buiyen99@gmail.com',
    phone: '0901234538',
    homeAddress: {
      addressLine1: '68 Hàm Nghi',
      ward: 'Nguyễn Thái Bình',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Đỗ Hải',
    firstName: 'Đăng',
    email: 'dang.dohai94@gmail.com',
    phone: '0901234539',
    homeAddress: {
      addressLine1: '10 Mai Chí Thọ',
      ward: 'Thủ Thiêm',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
    workAddress: {
      addressLine1: 'Tòa nhà Saigon Centre Tower 2, 67 Lê Lợi',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      province: 'TP. Hồ Chí Minh',
      postalCode: '700000',
    },
  },
  {
    lastName: 'Nguyễn Khánh',
    firstName: 'Vy',
    email: 'vy.nguyenkhanh98@gmail.com',
    phone: '0901234540',
    homeAddress: {
      addressLine1: '25 Duy Tân',
      ward: 'Dịch Vọng Hậu',
      district: 'Quận Cầu Giấy',
      city: 'Hà Nội',
      province: 'Hà Nội',
      postalCode: '100000',
    },
  },
];

export async function seedCustomersAndAddresses(
  prisma: PrismaClient,
  userRoleId: string,
  commonPasswordHash: string,
): Promise<SeededCustomer[]> {
  const seededCustomers: SeededCustomer[] = [];

  for (const customer of CUSTOMER_SEED_DATA) {
    // 1. Upsert customer user
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: {
        passwordHash: commonPasswordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        email: customer.email,
        passwordHash: commonPasswordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // 2. Upsert customer role mapping
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRoleId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userRoleId,
      },
    });

    // 3. Upsert primary HOME address (isDefault: true)
    let primaryAddress = await prisma.address.findFirst({
      where: {
        userId: user.id,
        type: AddressType.HOME,
      },
    });

    const homeData = {
      userId: user.id,
      type: AddressType.HOME,
      recipientName: `${customer.lastName} ${customer.firstName}`,
      phone: customer.phone,
      addressLine1: customer.homeAddress.addressLine1,
      addressLine2: customer.homeAddress.addressLine2,
      ward: customer.homeAddress.ward,
      district: customer.homeAddress.district,
      city: customer.homeAddress.city,
      province: customer.homeAddress.province,
      postalCode: customer.homeAddress.postalCode,
      country: 'Vietnam',
      isDefault: true,
    };

    if (primaryAddress) {
      primaryAddress = await prisma.address.update({
        where: { id: primaryAddress.id },
        data: homeData,
      });
    } else {
      primaryAddress = await prisma.address.create({
        data: homeData,
      });
    }

    // 4. Upsert WORK address if defined (isDefault: false)
    if (customer.workAddress) {
      const existingWorkAddress = await prisma.address.findFirst({
        where: {
          userId: user.id,
          type: AddressType.WORK,
        },
      });

      const workData = {
        userId: user.id,
        type: AddressType.WORK,
        recipientName: `${customer.lastName} ${customer.firstName} (VP)`,
        phone: customer.phone,
        addressLine1: customer.workAddress.addressLine1,
        addressLine2: customer.workAddress.addressLine2,
        ward: customer.workAddress.ward,
        district: customer.workAddress.district,
        city: customer.workAddress.city,
        province: customer.workAddress.province,
        postalCode: customer.workAddress.postalCode,
        country: 'Vietnam',
        isDefault: false,
      };

      if (existingWorkAddress) {
        await prisma.address.update({
          where: { id: existingWorkAddress.id },
          data: workData,
        });
      } else {
        await prisma.address.create({
          data: workData,
        });
      }
    }

    seededCustomers.push({
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? customer.firstName,
      lastName: user.lastName ?? customer.lastName,
      phone: user.phone ?? customer.phone,
      addressId: primaryAddress.id,
    });
  }

  return seededCustomers;
}
