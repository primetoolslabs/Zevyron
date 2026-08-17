import { useState, useEffect } from "react"
import { invoke } from "@/lib/electron"
import { useI18n } from "@/i18n"

function Greeting() {
  const [name, setName] = useState("")
  const { t } = useI18n()
  useEffect(() => {
    const cached = localStorage.getItem("zevyron:user")
    if (cached) setName(cached)
    else invoke({ channel: "get-user-name" }).then((username) => { if (username) { setName(username); localStorage.setItem("zevyron:user", username) } }).catch((err) => console.error("Error fetching user name:", err))
  }, [])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t("greeting.morning") : hour < 18 ? t("greeting.afternoon") : t("greeting.evening")
  return <h1 className="text-2xl font-bold mb-4">{greeting},{" "}<span className="bg-linear-to-r from-zevyron-primary to-zevyron-secondary bg-clip-text text-transparent">{name || t("greeting.friend")}</span></h1>
}
export default Greeting
