"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";

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

type AddressPayload = Omit<Address, "id" | "isDefault"> & {
  isDefault?: boolean;
};

type AddressContextValue = {
  addresses: Address[];
  defaultAddressId: string | null;
  addAddress: (address: AddressPayload) => Promise<Address | null>;
  updateAddress: (id: string, address: AddressPayload) => Promise<Address | null>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<Address | null>;
  getAddress: (id: string) => Address | undefined;
  isLoaded: boolean;
  isSyncing: boolean;
  error: string | null;
  refreshAddresses: () => Promise<void>;
};

const AddressContext = createContext<AddressContextValue | null>(null);

function mapBackendAddress(value: {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}): Address {
  return {
    id: value.id,
    fullName: value.fullName,
    phone: value.phone,
    addressLine1: value.line1,
    addressLine2: value.line2 ?? undefined,
    city: value.city,
    state: value.state,
    postalCode: value.postalCode,
    country: value.country,
    isDefault: value.isDefault,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string | string[]; error?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray(data.message)
          ? data.message[0]
          : data.message
        : data && typeof data === "object" && "error" in data
          ? data.error
          : undefined;

    throw new Error(message ?? "Unable to update your account.");
  }

  return data as T;
}

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAddresses = useCallback(async () => {
    setError(null);

    if (!isAuthenticated) {
      setAddresses([]);
      setIsLoaded(true);
      return;
    }

    try {
      const data = await request<
        Array<{
          id: string;
          fullName: string;
          phone: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postalCode: string;
          country: string;
          isDefault: boolean;
        }>
      >("/api/account/addresses");

      setAddresses(data.map(mapBackendAddress));
    } catch (cause) {
      setAddresses([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load your addresses.",
      );
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading) return;
    void refreshAddresses();
  }, [isAuthLoading, refreshAddresses]);

  const addAddress = useCallback(
    async (address: AddressPayload) => {
      if (!isAuthenticated) {
        setError("Please sign in before saving an address.");
        return null;
      }

      setIsSyncing(true);
      setError(null);

      try {
        const data = await request<{
          id: string;
          fullName: string;
          phone: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postalCode: string;
          country: string;
          isDefault: boolean;
        }>("/api/account/addresses", {
          method: "POST",
          body: JSON.stringify({
            fullName: address.fullName,
            phone: address.phone,
            line1: address.addressLine1,
            line2: address.addressLine2 || undefined,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            isDefault: address.isDefault,
          }),
        });

        const next = mapBackendAddress(data);
        setAddresses((current) => [
          ...current.map((item) => ({
            ...item,
            isDefault: next.isDefault ? false : item.isDefault,
          })),
          next,
        ]);
        return next;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to save address.",
        );
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated],
  );

  const updateAddress = useCallback(
    async (id: string, address: AddressPayload) => {
      if (!isAuthenticated) {
        setError("Please sign in before updating an address.");
        return null;
      }

      setIsSyncing(true);
      setError(null);

      try {
        const data = await request<{
          id: string;
          fullName: string;
          phone: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postalCode: string;
          country: string;
          isDefault: boolean;
        }>(`/api/account/addresses/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: address.fullName,
            phone: address.phone,
            line1: address.addressLine1,
            line2: address.addressLine2 || undefined,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            isDefault: address.isDefault,
          }),
        });

        const next = mapBackendAddress(data);
        setAddresses((current) =>
          current.map((item) => ({
            ...(item.id === next.id ? next : item),
            isDefault:
              next.isDefault && item.id !== next.id ? false : (
                item.id === next.id ? next.isDefault : item.isDefault
              ),
          })),
        );
        return next;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to update address.",
        );
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated],
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        setError("Please sign in before deleting an address.");
        return false;
      }

      setIsSyncing(true);
      setError(null);

      try {
        await request<{ message: string }>(
          `/api/account/addresses/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        setAddresses((current) =>
          current.filter((item) => item.id !== id),
        );
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to delete address.",
        );
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      const address = addresses.find((item) => item.id === id);
      if (!address) return null;

      return updateAddress(id, {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        label: address.label,
        isDefault: true,
      });
    },
    [addresses, updateAddress],
  );

  const getAddress = useCallback(
    (id: string) => addresses.find((address) => address.id === id),
    [addresses],
  );

  const defaultAddressId =
    addresses.find((address) => address.isDefault)?.id ?? null;

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
      isSyncing,
      error,
      refreshAddresses,
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
      isSyncing,
      error,
      refreshAddresses,
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
    throw new Error("useAddresses must be used within AddressProvider");
  }
  return context;
}
