import Modal from "./ui/modal"
import Button from "./ui/button"

function NoAdmin({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-zevyron-card p-4 rounded-2xl border border-zevyron-border text-zevyron-text w-[90vw] max-w-md">
        <h1 className="text-lg font-semibold mb-2">Zevyron Not Running as Admin</h1>
        <p className="text-sm mb-4">
          Zevyron is not running with administrator privileges. Some features may not work
          correctly.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default NoAdmin
