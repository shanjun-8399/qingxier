import { vi } from 'vitest';
const storage=new Map<string,unknown>();
(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k),setStorageSync:(k:string,v:unknown)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k),request:vi.fn(),reLaunch:vi.fn(),navigateTo:vi.fn(),showToast:vi.fn(),showModal:vi.fn(),login:vi.fn(),openBluetoothAdapter:vi.fn(),startBluetoothDevicesDiscovery:vi.fn(),stopBluetoothDevicesDiscovery:vi.fn(),onBluetoothDeviceFound:vi.fn(),createBLEConnection:vi.fn(),closeBluetoothAdapter:vi.fn()};
beforeEach(()=>{storage.clear();vi.clearAllMocks();});
