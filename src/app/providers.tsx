"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";
import { makeStore } from "@/lib/redux/store";

export default function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  const [queryClient] = useState(makeQueryClient);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ReduxProvider>
  );
}