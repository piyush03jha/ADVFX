"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label?: string;
  isDefault: boolean;
}

interface AddressContextValue {
  addresses: Address[];
  defaultAddressId: string | null;
  addAddress: (
    address: Omit<Address, "id" | "isDefault"> & {
      isDefault?: boolean;
    },
  ) => void;
  updateAddress: (
    id: string,
    address: Omit<Address, "id" | "isDefault"> & {
      isDefault?: boolean;
    },
  ) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  getAddress: (id: string) => Address | undefined;
  isLoaded: boolean;
}

const STORAGE_KEY = "forma-addresses";

const initialAddresses: Address[] = [
  {
    id: "home-default",
    fullName: "Piyush Jha",
    phone: "+91 98XXXXXX21",
    addressLine1: "Example Street",
    addressLine2: "New Delhi",
    city: "Delhi",
    state: "Delhi",
    postalCode: "1100XX",
    country: "India",
    label: "Home",
    isDefault: true,
  },
];

const AddressContext = createContext<AddressContextValue | null>(null);

function normalizeAddresses(input: unknown): Address[] {
  if (!Array.isArray(input)) return initialAddresses;

  const valid = input.filter((value): value is Address => {
    if (!value || typeof value !== "object") return false;
    const address = value as Partial<Address>;

    return (
      typeof address.id === "string" &&
      typeof address.fullName === "string" &&
      typeof address.phone === "string" &&
      typeof address.addressLine1 === "string" &&
      typeof address.city === "string" &&
      typeof address.state === "string" &&
      typeof address.postalCode === "string" &&
      typeof address.country === "string" &&
      typeof address.isDefault === "boolean"
    );
  });

  if (valid.length === 0) return [];

  const defaultIndex = valid.findIndex(
    (item) => item.isDefault,
  );

  return valid.map((item, index) => ({
    ...item,
    isDefault:
      defaultIndex === -1
        ? index === 0
        : index === defaultIndex,
  }));
}

export function AddressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setAddresses(initialAddresses);
      } else {
        setAddresses(normalizeAddresses(JSON.parse(raw)));
      }
    } catch {
      setAddresses(initialAddresses);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(addresses),
      );
    } catch {
      // Keep address state in memory if storage is unavailable.
    }
  }, [addresses, isLoaded]);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses((current) =>
      current.map((address) => ({
        ...address,
        isDefault: address.id === id,
      })),
    );
  }, []);

  const addAddress = useCallback(
    (
      address: Omit<Address, "id" | "isDefault"> & {
        isDefault?: boolean;
      },
    ) => {
      const id = `address-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      setAddresses((current) => {
        const shouldBeDefault =
          address.isDefault === true ||
          current.length === 0;

        const next = current.map((item) => ({
          ...item,
          isDefault: shouldBeDefault
            ? false
            : item.isDefault,
        }));

        next.push({
          ...address,
          id,
          isDefault: shouldBeDefault,
        });

        return next;
      });
    },
    [],
  );

  const updateAddress = useCallback(
    (
      id: string,
      address: Omit<Address, "id" | "isDefault"> & {
        isDefault?: boolean;
      },
    ) => {
      setAddresses((current) => {
        const makeDefault = address.isDefault === true;

        return current.map((item) => ({
          ...item,
          ...(item.id === id ? address : {}),
          isDefault: makeDefault
            ? item.id === id
            : item.isDefault,
        }));
      });
    },
    [],
  );

  const deleteAddress = useCallback((id: string) => {
    setAddresses((current) => {
      const removed = current.find(
        (item) => item.id === id,
      );
      const next = current.filter(
        (item) => item.id !== id,
      );

      if (removed?.isDefault && next.length > 0) {
        next[0] = {
          ...next[0],
          isDefault: true,
        };
      }

      return next;
    });
  }, []);

  const defaultAddressId =
    addresses.find((address) => address.isDefault)
      ?.id ?? null;

  const getAddress = useCallback(
    (id: string) =>
      addresses.find((address) => address.id === id),
    [addresses],
  );

  const value = useMemo<AddressContextValue>(
    () => ({
      addresses,
      defaultAddressId,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getAddress,
      isLoaded,
    }),
    [
      addresses,
      defaultAddressId,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getAddress,
      isLoaded,
    ],
  );

  return (
    <AddressContext.Provider value={value}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddresses() {
  const context = useContext(AddressContext);

  if (!context) {
    throw new Error(
      "useAddresses must be used within an AddressProvider",
    );
  }

  return context;
}
