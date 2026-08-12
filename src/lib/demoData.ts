import { processDataset } from './analyzer';
import { Dataset } from '@/types';

export const DEMO_DATASET_NAME = "Sales Analytics Dataset (DEMO)";
export const DEMO_FILENAME = "demo_sales_analytics.csv";

const DEMO_SALES_CSV = `Order ID,Date,Customer,Region,Category,Product,Quantity,Unit Price,Revenue,Cost,Profit
ORD-2024-1001,2024-01-15,Acme Corp,North America,Electronics,Pro Laptop 15",2,1250.00,2500.00,1625.00,875.00
ORD-2024-1002,2024-01-16,Apex Global,Europe,Software,Enterprise Cloud License,10,299.00,2990.00,598.00,2392.00
ORD-2024-1003,2024-01-18,Starlight Retail,Asia-Pacific,Furniture,Ergonomic Executive Desk,4,450.00,1800.00,1080.00,720.00
ORD-2024-1004,2024-01-20,Nexus Logistics,North America,Office Supplies,Premium Paper Bundle,25,18.50,462.50,231.25,231.25
ORD-2024-1005,2024-01-22,Horizon Health,Latin America,Electronics,4K Ultra Monitor 27",5,380.00,1900.00,1235.00,665.00
ORD-2024-1006,2024-01-25,Vanguard Systems,Europe,Software,Security Suite Pro,1,850.00,850.00,170.00,680.00
ORD-2024-1007,2024-01-28,Pinnacle Group,Asia-Pacific,Electronics,Wireless Noise-Canceling Headset,8,195.00,1560.00,936.00,624.00
ORD-2024-1008,2024-02-02,Beacon Media,North America,Furniture,Mesh Ergonomic Chair,6,320.00,1920.00,1152.00,768.00
ORD-2024-1009,2024-02-05,Atlas Holdings,Europe,Office Supplies,Laser Toner Cartridge Pack,12,85.00,1020.00,510.00,510.00
ORD-2024-1010,2024-02-08,Crestview Labs,Latin America,Electronics,Docking Station Pro,3,220.00,660.00,429.00,231.00
ORD-2024-1011,2024-02-11,Quantum FinTech,North America,Software,Data Analytics Workstation,2,1500.00,3000.00,900.00,2100.00
ORD-2024-1012,2024-02-14,Solstice Energy,Asia-Pacific,Electronics,Pro Laptop 15",3,1250.00,3750.00,2437.50,1312.50
ORD-2024-1013,2024-02-17,Velocity Corp,Europe,Furniture,Standing Desk Converter,5,280.00,1400.00,840.00,560.00
ORD-2024-1014,2024-02-20,Trident Marine,North America,Office Supplies,High-Speed Document Scanner,2,420.00,840.00,504.00,336.00
ORD-2024-1015,2024-02-24,Orion Tech,Latin America,Software,Enterprise Cloud License,8,299.00,2392.00,478.40,1913.60
ORD-2024-1016,2024-03-01,Summit Partners,Europe,Electronics,4K Ultra Monitor 27",4,380.00,1520.00,988.00,532.00
ORD-2024-1017,2024-03-04,Genesis Bio,Asia-Pacific,Software,Security Suite Pro,3,850.00,2550.00,510.00,2040.00
ORD-2024-1018,2024-03-08,Apex Global,Europe,Electronics,Wireless Noise-Canceling Headset,15,195.00,2925.00,1755.00,1170.00
ORD-2024-1019,2024-03-12,Acme Corp,North America,Furniture,Mesh Ergonomic Chair,10,320.00,3200.00,1920.00,1280.00
ORD-2024-1020,2024-03-15,Nexus Logistics,North America,Office Supplies,Laser Toner Cartridge Pack,20,85.00,1700.00,850.00,850.00
ORD-2024-1021,2024-03-18,Starlight Retail,Asia-Pacific,Electronics,Docking Station Pro,6,220.00,1320.00,858.00,462.00
ORD-2024-1022,2024-03-22,Beacon Media,North America,Software,Data Analytics Workstation,1,1500.00,1500.00,450.00,1050.00
ORD-2024-1023,2024-03-25,Horizon Health,Latin America,Furniture,Ergonomic Executive Desk,2,450.00,900.00,540.00,360.00
ORD-2024-1024,2024-03-28,Vanguard Systems,Europe,Office Supplies,Premium Paper Bundle,40,18.50,740.00,370.00,370.00
ORD-2024-1025,2024-04-02,Pinnacle Group,Asia-Pacific,Electronics,Pro Laptop 15",4,1250.00,5000.00,3250.00,1750.00
ORD-2024-1026,2024-04-05,Crestview Labs,Latin America,Software,Enterprise Cloud License,6,299.00,1794.00,358.80,1435.20
ORD-2024-1027,2024-04-09,Quantum FinTech,North America,Electronics,4K Ultra Monitor 27",6,380.00,2280.00,1482.00,798.00
ORD-2024-1028,2024-04-12,Solstice Energy,Asia-Pacific,Furniture,Standing Desk Converter,8,280.00,2240.00,1344.00,896.00
ORD-2024-1029,2024-04-16,Velocity Corp,Europe,Office Supplies,High-Speed Document Scanner,3,420.00,1260.00,756.00,504.00
ORD-2024-1030,2024-04-20,Trident Marine,North America,Software,Security Suite Pro,2,850.00,1700.00,340.00,1360.00
ORD-2024-1031,2024-04-24,Orion Tech,Latin America,Electronics,Wireless Noise-Canceling Headset,10,195.00,1950.00,1170.00,780.00
ORD-2024-1032,2024-04-28,Summit Partners,Europe,Furniture,Mesh Ergonomic Chair,5,320.00,1600.00,960.00,640.00
ORD-2024-1033,2024-05-02,Genesis Bio,Asia-Pacific,Office Supplies,Laser Toner Cartridge Pack,15,85.00,1275.00,637.50,637.50
ORD-2024-1034,2024-05-06,Atlas Holdings,Europe,Electronics,Docking Station Pro,7,220.00,1540.00,1001.00,539.00
ORD-2024-1035,2024-05-10,Acme Corp,North America,Software,Data Analytics Workstation,3,1500.00,4500.00,1350.00,3150.00
ORD-2024-1036,2024-05-14,Apex Global,Europe,Electronics,Pro Laptop 15",5,1250.00,6250.00,4062.50,2187.50
ORD-2024-1037,2024-05-18,Nexus Logistics,North America,Software,Enterprise Cloud License,12,299.00,3588.00,717.60,2870.40
ORD-2024-1038,2024-05-22,Starlight Retail,Asia-Pacific,Furniture,Ergonomic Executive Desk,3,450.00,1350.00,810.00,540.00
ORD-2024-1039,2024-05-26,Horizon Health,Latin America,Office Supplies,Premium Paper Bundle,30,18.50,555.00,277.50,277.50
ORD-2024-1040,2024-05-30,Vanguard Systems,Europe,Electronics,4K Ultra Monitor 27",8,380.00,3040.00,1976.00,1064.00
ORD-2024-1040,2024-05-30,Vanguard Systems,Europe,Electronics,4K Ultra Monitor 27",8,380.00,3040.00,1976.00,1064.00
ORD-2024-1041,2024-06-03,Beacon Media,North America,Software,Security Suite Pro,4,850.00,3400.00,680.00,2720.00
ORD-2024-1042,2024-06-07,Pinnacle Group,Asia-Pacific,Electronics,Wireless Noise-Canceling Headset,12,195.00,2340.00,1404.00,936.00
ORD-2024-1043,2024-06-11,Crestview Labs,Latin America,Furniture,Mesh Ergonomic Chair,4,320.00,1280.00,768.00,512.00
ORD-2024-1044,2024-06-15,Quantum FinTech,North America,Office Supplies,Laser Toner Cartridge Pack,18,85.00,1530.00,765.00,765.00
ORD-2024-1045,2024-06-19,Solstice Energy,Asia-Pacific,Electronics,Docking Station Pro,5,220.00,1100.00,715.00,385.00
ORD-2024-1046,2024-06-23,Velocity Corp,Europe,Software,Data Analytics Workstation,2,1500.00,3000.00,900.00,2100.00
ORD-2024-1047,2024-06-27,Trident Marine,North America,Furniture,Standing Desk Converter,6,280.00,1680.00,1008.00,672.00
ORD-2024-1048,2024-07-01,Orion Tech,Latin America,Office Supplies,High-Speed Document Scanner,4,420.00,1680.00,1008.00,672.00
ORD-2024-1049,2024-07-05,Summit Partners,Europe,Electronics,Pro Laptop 15",3,1250.00,3750.00,2437.50,1312.50
ORD-2024-1050,2024-07-10,Genesis Bio,Asia-Pacific,Software,Enterprise Cloud License,15,299.00,4485.00,897.00,3588.00`;

export async function createDemoDataset(): Promise<Dataset> {
  const file = new File([DEMO_SALES_CSV], DEMO_FILENAME, { type: "text/csv" });
  const dataset = await processDataset(file);
  return {
    ...dataset,
    name: DEMO_DATASET_NAME,
    filename: DEMO_FILENAME,
  };
}
