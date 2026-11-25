"use client";

import { useEffect, useState } from "react";
import { legalPublic } from "./legal-public";

/** Version of the legal documents the buyer is shown; "" until the server answers. */
export function useLegalVersion() {
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    legalPublic
      .index()
      .then((index) => live && setVersion(index.version))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Không tải được điều khoản."));
    return () => {
      live = false;
    };
  }, []);
  return { version, error };
}
