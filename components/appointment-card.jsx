"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  Video,
  Stethoscope,
  X,
  Edit,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelAppointment,
  addAppointmentNotes,
  markAppointmentCompleted,
} from "@/actions/doctor";
import { generateVideoToken } from "@/actions/appointments";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AppointmentCard({
  appointment,
  userRole,
  refetchAppointments,
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null); // 'cancel', 'notes', 'video', or 'complete'
  const [notes, setNotes] = useState(appointment.notes || "");
  const router = useRouter();

  // UseFetch hooks for server actions
  const {
    loading: cancelLoading,
    fn: submitCancel,
    data: cancelData,
  } = useFetch(cancelAppointment);
  const {
    loading: notesLoading,
    fn: submitNotes,
    data: notesData,
  } = useFetch(addAppointmentNotes);
  const {
    loading: tokenLoading,
    fn: submitTokenRequest,
    data: tokenData,
  } = useFetch(generateVideoToken);
  const {
    loading: completeLoading,
    fn: submitMarkCompleted,
    data: completeData,
  } = useFetch(markAppointmentCompleted);

  // Format date and time
  const formatDateTime = (dateString) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Format time only
  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), "h:mm a");
    } catch (e) {
      return "Invalid time";
    }
  };

  // Check if appointment can be marked as completed
  const canMarkCompleted = () => {
    if (userRole !== "DOCTOR" || appointment.status !== "SCHEDULED") {
      return false;
    }
    const now = new Date();
    const appointmentEndTime = new Date(appointment.endTime);
    return now >= appointmentEndTime;
  };

  // Handle cancel appointment
  const handleCancelAppointment = async () => {
    if (cancelLoading) return;

    if (
      window.confirm(
        "Are you sure you want to cancel this appointment? This action cannot be undone."
      )
    ) {
      const formData = new FormData();
      formData.append("appointmentId", appointment.id);
      await submitCancel(formData);
    }
  };

  // Handle mark as completed
  const handleMarkCompleted = async () => {
    if (completeLoading) return;

    // Check if appointment end time has passed
    const now = new Date();
    const appointmentEndTime = new Date(appointment.endTime);

    if (now < appointmentEndTime) {
      alert(
        "Cannot mark appointment as completed before the scheduled end time."
      );
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to mark this appointment as completed? This action cannot be undone."
      )
    ) {
      const formData = new FormData();
      formData.append("appointmentId", appointment.id);
      await submitMarkCompleted(formData);
    }
  };

  // Handle save notes (doctor only)
  const handleSaveNotes = async () => {
    if (notesLoading || userRole !== "DOCTOR") return;

    const formData = new FormData();
    formData.append("appointmentId", appointment.id);
    formData.append("notes", notes);
    await submitNotes(formData);
  };

  // Handle join video call
  const handleJoinVideoCall = async () => {
    if (tokenLoading) return;

    setAction("video");

    const formData = new FormData();
    formData.append("appointmentId", appointment.id);
    await submitTokenRequest(formData);
  };

  // Handle successful operations
  useEffect(() => {
    if (cancelData?.success) {
      toast.success("Appointment cancelled successfully");
      setOpen(false);
      if (refetchAppointments) {
        refetchAppointments();
      } else {
        router.refresh();
      }
    }
  }, [cancelData, refetchAppointments, router]);

  useEffect(() => {
    if (completeData?.success) {
      toast.success("Appointment marked as completed");
      setOpen(false);
      if (refetchAppointments) {
        refetchAppointments();
      } else {
        router.refresh();
      }
    }
  }, [completeData, refetchAppointments, router]);

  useEffect(() => {
    if (notesData?.success) {
      toast.success("Notes saved successfully");
      setAction(null);
      if (refetchAppointments) {
        refetchAppointments();
      } else {
        router.refresh();
      }
    }
  }, [notesData, refetchAppointments, router]);

  useEffect(() => {
    if (tokenData?.success) {
      // Redirect to video call page with token and session ID
      router.push(
        `/video-call?sessionId=${tokenData.videoSessionId}&token=${tokenData.token}&appointmentId=${appointment.id}`
      );
    } else if (tokenData?.error) {
      setAction(null);
    }
  }, [tokenData, appointment.id, router]);

  // Determine if appointment is active (within 30 minutes of start time)
  const isAppointmentActive = () => {
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const appointmentEndTime = new Date(appointment.endTime);

    // Can join 30 minutes before start until end time
    return (
      (appointmentTime.getTime() - now.getTime() <= 30 * 60 * 1000 &&
        now < appointmentTime) ||
      (now >= appointmentTime && now <= appointmentEndTime)
    );
  };

  // Determine other party information based on user role
  const otherParty =
    userRole === "DOCTOR" ? appointment.patient : appointment.doctor;

  const otherPartyLabel = userRole === "DOCTOR" ? "Patient" : "Doctor";
  const otherPartyIcon = userRole === "DOCTOR" ? <User /> : <Stethoscope />;

  return (
    <>
      <Card className="border-emerald-900/20 hover:border-emerald-700/30 transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted/20 rounded-full p-2 mt-1">
                {otherPartyIcon}
              </div>
              <div>
                <h3 className="font-medium text-white">
                  {userRole === "DOCTOR"
                    ? otherParty.name
                    : `Dr. ${otherParty.name}`}
                </h3>
                {userRole === "DOCTOR" && (
                  <p className="text-sm text-muted-foreground">
                    {otherParty.email}
                  </p>
                )}
                {userRole === "PATIENT" && (
                  <p className="text-sm text-muted-foreground">
                    {otherParty.specialty}
                  </p>
                )}
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDateTime(appointment.startTime)}</span>
                </div>
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    {formatTime(appointment.startTime)} -{" "}
                    {formatTime(appointment.endTime)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 self-end md:self-start">
              <Badge
                variant="outline"
                className={
                  appointment.status === "COMPLETED"
                    ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                    : appointment.status === "CANCELLED"
                    ? "bg-red-900/20 border-red-900/30 text-red-400"
                    : "bg-amber-900/20 border-amber-900/30 text-amber-400"
                }
              >
                {appointment.status}
              </Badge>
              <div className="flex gap-2 mt-2 flex-wrap">
                {canMarkCompleted() && (
                  <Button
                    size="sm"
                    onClick={handleMarkCompleted}
                    disabled={completeLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {completeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-900/30"
                  onClick={() => setOpen(true)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-md p-4 md:p-6 bg-background/95 rounded-2xl border border-emerald-900/30 shadow-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              {appointment.status === "SCHEDULED"
                ? "Manage your upcoming appointment"
                : "View appointment information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground font-medium">{otherPartyLabel}:</span>
              <span className="text-white font-semibold">
                {userRole === "DOCTOR" ? otherParty.name : `Dr. ${otherParty.name}`}
              </span>
              {userRole === "DOCTOR" && (
                <span className="text-muted-foreground text-xs">{otherParty.email}</span>
              )}
              {userRole === "PATIENT" && (
                <span className="text-muted-foreground text-xs">{otherParty.specialty}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground font-medium">Scheduled Time:</span>
              <span className="text-white">{formatDateTime(appointment.startTime)}</span>
              <span className="text-muted-foreground text-xs">
                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground font-medium">Status:</span>
              <Badge
                variant="outline"
                className={
                  appointment.status === "COMPLETED"
                    ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                    : appointment.status === "CANCELLED"
                    ? "bg-red-900/20 border-red-900/30 text-red-400"
                    : "bg-amber-900/20 border-amber-900/30 text-amber-400"
                }
              >
                {appointment.status}
              </Badge>
            </div>
            {appointment.patientDescription && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground font-medium">
                  {userRole === "DOCTOR" ? "Patient Description" : "Your Description"}
                </span>
                <div className="p-2 rounded-md bg-muted/20 border border-emerald-900/20">
                  <span className="text-white whitespace-pre-line">
                    {appointment.patientDescription}
                  </span>
                </div>
              </div>
            )}
            {appointment.status === "SCHEDULED" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground font-medium">Video Consultation:</span>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!isAppointmentActive() || action === "video" || tokenLoading}
                  onClick={handleJoinVideoCall}
                >
                  {tokenLoading || action === "video" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Video Call...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      {isAppointmentActive()
                        ? "Join Video Call"
                        : "Video call will be available 30 minutes before appointment"}
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground font-medium">Doctor Notes:</span>
              {userRole === "DOCTOR" && action === "notes" ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter your clinical notes here..."
                    className="bg-background border-emerald-900/20 min-h-[100px]"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAction(null);
                        setNotes(appointment.notes || "");
                      }}
                      disabled={notesLoading}
                      className="border-emerald-900/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={notesLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {notesLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Notes"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-md bg-muted/20 border border-emerald-900/20 min-h-[60px]">
                  {appointment.notes ? (
                    <span className="text-white whitespace-pre-line">
                      {appointment.notes}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      No notes added yet
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 mt-4">
            <div className="flex gap-2">
              {canMarkCompleted() && (
                <Button
                  onClick={handleMarkCompleted}
                  disabled={completeLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {completeLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </>
                  )}
                </Button>
              )}
              {appointment.status === "SCHEDULED" && (
                <Button
                  variant="outline"
                  onClick={handleCancelAppointment}
                  disabled={cancelLoading}
                  className="border-red-900/30 text-red-400 hover:bg-red-900/10 mt-3 sm:mt-0"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel Appointment
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button
              onClick={() => setOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}