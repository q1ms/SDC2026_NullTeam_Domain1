import { Info, Sparkles } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function ProfileContextDialog({ profileSummary }: { profileSummary: string }) {
  const { t } = useLanguage();

  return (
    <div className="profile-context-control">
      <Dialog>
        <DialogTrigger asChild>
          <button className="button-quiet profile-context-button" type="button" data-testid="button-view-profile-context">
            <Info size={14} aria-hidden="true" /> {t("pathway.profileContextButton")}
          </button>
        </DialogTrigger>
        <DialogContent className="profile-context-dialog" data-testid="dialog-profile-context">
          <DialogHeader className="profile-context-header">
            <DialogTitle>{t("pathway.profileContextTitle")}</DialogTitle>
            <DialogDescription className="profile-context-summary">{profileSummary}</DialogDescription>
          </DialogHeader>
          <div className="profile-context-note" role="note">
            <Sparkles size={14} aria-hidden="true" />
            <p>{t("pathway.profileContextNotice")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
