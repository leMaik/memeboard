import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  useEffect(() => {
    const id = uuidv4();
    window.location.href = `/streams/${id}/buttons`;
  }, []);

  return null;
}
