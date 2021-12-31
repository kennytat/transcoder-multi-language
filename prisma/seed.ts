import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const rootData: Prisma.RootCreateInput[] = [
  {
    name: 'root',
    children: {
      create: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          location: '/VGMV',
          isVideo: true,
          isLeaf: false,
          name: 'Video',
          url: 'home.video',
          children: {
            create: [
              {
                location: '/VGMV/01_BaiGiang',
                isVideo: true,
                url: '01-bai-giang',
                name: '01-Bài Giảng',
                isLeaf: false,
                children: {
                  create: [
                    {
                      location: '/VGMV/01_BaiGiang/CacDienGia',
                      isVideo: true,
                      url: '01-bai-giang.cac-dien-gia',
                      name: 'Các Diễn Giả',
                      isLeaf: true,
                      children: {
                        create: [
                          {
                            location: '/VGMV/01_BaiGiang/CacDienGia/MSMPH_ChuToanHayKhongChuToanChucVuChuaGiao',
                            isVideo: true,
                            url: '01-bai-giang.cac-dien-gia.msmph-chu-toan-hay-khong-chu-toan-chuc-vu-chua-giao',
                            name: 'MSMPH_Chu Toàn Hay Không Chu Toàn Chức Vụ Chúa Giao'
                          },
                        ]
                      },
                    },
                  ]
                },
              },
              {
                location: '/VGMV/02_KhoaHocVaNiemTin',
                isVideo: true,
                isLeaf: false,
                url: '02-khoa-hoc-va-niem-tin',
                name: '02-Khoa Học Và Niềm Tin'
              },
              {
                location: '/VGMV/03_HoatHinh',
                isVideo: true,
                isLeaf: false,
                url: '03-hoat-hinh',
                name: '03-Hoạt Hình'
              },
              {
                location: '/VGMV/04_ThieuNhi',
                isVideo: true,
                isLeaf: false,
                url: '04-thieu-nhi',
                name: '04-Thiếu Nhi'
              },
              {
                location: '/VGMV/05_NgonNguKyHieu',
                isVideo: true,
                isLeaf: false,
                url: '05-ngon-ngu-ky-hieu',
                name: '05-Ngôn Ngữ Ký Hiệu'
              },
            ]
          }
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          location: '/VGMA',
          isVideo: false,
          isLeaf: false,
          name: 'Audio',
          url: 'home.audio',
          children: {
            create: [
              {
                location: '/VGMA/BaiGiangTheoDienGia',
                isVideo: false,
                isLeaf: false,
                url: 'bai-giang-theo-dien-gia',
                name: 'Bài Giảng Theo Diễn Giả',
              },
            ]
          }
        },
      ],
    },
  }
]

async function main() {
  console.log(`Start seeding ...`)
  for (const db of rootData) {
    const root = await prisma.root.create({
      data: db,
    })
    console.log(`Created user with id: ${root.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
