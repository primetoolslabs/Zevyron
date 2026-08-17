import { useEffect, useState } from "react"
import Modal from "@/components/ui/modal"
import Button from "./ui/button"
import { toast } from "react-toastify"
import { invoke } from "@/lib/electron"
import data from "../../../../package.json"
import zevyronVertical from "../../../../resources/zevyron-vertical.png"

export default function FirstTime(): React.ReactElement {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const firstTime = localStorage.getItem("firstTime")
    if (!firstTime || firstTime === "true") {
      const timer = setTimeout(() => setOpen(true), 20)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  const handleGetStarted = async () => {
    localStorage.setItem("firstTime", "false")
    setOpen(false)

    const toastId = toast.info("Creating restore point... Please wait before applying tweaks.", {
      autoClose: false,
      isLoading: true,
      closeOnClick: false,
      draggable: false,
    })

    try {
      await invoke({ channel: "create-zevyron-restore-point" })

      toast.update(toastId, {
        render: "Restore point created!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
    } catch (err) {
      toast.update(toastId, {
        render: "Failed to create restore point.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
      console.error("Error creating restore point:", err)
    }
  }

  const handleSkipRestorePoint = () => {
    localStorage.setItem("firstTime", "false")
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={undefined}>
      <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-4 shadow-2xl max-w-2xl w-full mx-4 flex flex-col items-center text-center">
        <img src={zevyronVertical} alt="Zevyron" className="h-40 max-w-[300px] object-contain mb-3 drop-shadow-[0_0_22px_rgba(0,174,255,0.2)]" />
        <h1 className="text-2xl font-bold text-zevyron-text mb-3">Welcome to Zevyron</h1>

        <p className="text-zevyron-text-secondary mb-6">
          It looks like this is your first time here. <br />
          Would you like to create a restore point before you start?
        </p>

        <p className="text-zevyron-text-secondary mb-4 text-sm">
          <span className="font-medium">
            By clicking <strong>Yes</strong>, Zevyron will create a restore point and disable the
            cooldown for future restore points.
          </span>
        </p>

        <p className="text-zevyron-text-secondary mb-8 text-sm">
          For your security, use only official Zevyron builds provided by your authorized distribution channel.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button onClick={handleGetStarted}>Yes (Recommended)</Button>
          <Button onClick={handleSkipRestorePoint} variant="danger">
            No (Not Recommended)
          </Button>
        </div>

        <p className="text-zevyron-text-secondary mt-4 text-sm">
          <span className="font-semibold">Zevyron Version:</span>{" "}
          {data?.version || "Error fetching version"}
        </p>
      </div>
    </Modal>
  )
}
