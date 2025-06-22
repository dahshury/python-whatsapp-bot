import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // In production, this would call the Python backend's translation endpoint
    // For now, we'll return a structure that matches the Python i18n.py format
    const translations = {
      // Validation messages
      "validation_required": { en: "{field} is required", ar: "{field} مطلوب" },
      "validation_invalid_format": { en: "Invalid format", ar: "تنسيق غير صالح" },
      "validation_invalid_name": { en: "Invalid name format", ar: "تنسيق الاسم غير صالح" },
      "validation_invalid_email": { en: "Invalid email format", ar: "البريد الإلكتروني غير صالح" },
      "validation_invalid_phone": { en: "Invalid phone number", ar: "رقم الهاتف غير صالح" },
      "validation_invalid_date": { en: "Invalid date", ar: "التاريخ غير صالح" },
      "validation_invalid_time": { en: "Invalid time", ar: "الوقت غير صالح" },
      "validation_this_field_required": { en: "This field is required", ar: "هذا الحقل مطلوب" },
      "validation_please_fix_errors": { en: "Please fix validation errors before saving", ar: "يرجى تصحيح الأخطاء قبل الحفظ" },
      "validation_unsaved_changes": { en: "You have unsaved changes. Are you sure you want to close?", ar: "لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد الإغلاق؟" },
      "validation_phone_length": { en: "Phone number must be between 8 and 15 digits", ar: "رقم الهاتف يجب أن يكون بين 8-15 رقمًا" },
      
      // Grid messages
      "grid_none": { en: "None", ar: "لا شيء" },
      "grid_add_row": { en: "Click to add a new row", ar: "انقر لإضافة صف جديد" },
      "grid_please_fill_cell": { en: "Please fill out this cell", ar: "يرجى ملء هذا الحقل" },
      
      // Field names
      "field_date": { en: "Date", ar: "التاريخ" },
      "field_time": { en: "Time", ar: "الوقت" },
      "field_phone": { en: "Phone", ar: "رقم الهاتف" },
      "field_name": { en: "Name", ar: "الاسم" },
      "field_type": { en: "Type", ar: "النوع" },
      
      // Import all messages from Python's i18n.py
      "system_error_try_later": { en: "System error occurred. try again later.", ar: "حدث خطأ في النظام. حاول مرة أخرى لاحقًا." },
      "system_error_generic": { en: "An unexpected error occurred: {error}. Please try again later.", ar: "حدث خطأ غير متوقع: {error}. حاول مرة أخرى لاحقًا." },
      "invalid_date_format": { en: "Invalid date format: {error}", ar: "تنسيق تاريخ غير صالح: {error}" },
      "past_date_error": { en: "Cannot schedule for past dates.", ar: "لا يمكنك الجدولة لتواريخ ماضية." },
      "system_error_contact_secretary": { en: "System error occurred. Ask user to contact the secretary to reserve.", ar: "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز." },
      "non_working_day": { en: "The clinic is closed on this day.", ar: "العيادة مغلقة في هذا اليوم." },
      "location_sent": { en: "Location sent.", ar: "تم إرسال الموقع." },
      "wa_id_same": { en: "The new wa_id is the same as the old wa_id.", ar: "رقم الواتساب الجديد هو نفسه رقم الواتساب القديم." },
      "wa_id_modified": { en: "wa_id modified successfully.", ar: "تم تعديل رقم الواتساب بنجاح." },
      "wa_id_not_found": { en: "No records found with WhatsApp ID {old_wa_id}.", ar: "لم يتم العثور على سجلات برقم الواتساب {old_wa_id}." },
      "invalid_date": { en: "Invalid date format.", ar: "تاريخ غير صالح." },
      "invalid_time": { en: "Invalid time format.", ar: "صيغة الوقت غير صالحة." },
      "cannot_reserve_past": { en: "Cannot reserve in the past.", ar: "لا يمكنك الحجز في الماضي." },
      "reservation_failed_slot": { en: "Reservation failed. The selected time slot ({slot}) is not available. Available slots: {slots}", ar: "فشل الحجز. الوقت الذي تم اختياره ({slot}) غير متاح. الأوقات المتاحة: {slots}" },
      "slot_fully_booked": { en: "This time slot is fully booked. Please choose another slot.", ar: "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر." },
      "phone_length_error": { en: "Phone number length is invalid (should be between 8-15 digits).", ar: "طول رقم الهاتف غير صالح (يجب أن يكون بين 8-15 رقمًا)." },
      "phone_format_error": { en: "Invalid phone number format.", ar: "صيغة رقم الهاتف غير صالحة." },
      "phone_invalid": { en: "Invalid phone number: {error}", ar: "رقم الهاتف غير صالح: {error}" },
      "phone_validation_error": { en: "Phone validation error.", ar: "خطأ في التحقق من صحة رقم الهاتف." },
      "invalid_reservation_type": { en: "Invalid reservation type. Must be 0 or 1.", ar: "نوع الحجز غير صالح. يجب أن يكون 0 أو 1." },
      "no_slots_available_approx": { en: "No available time slot found for approximation.", ar: "لم يتم العثور على موعد متاح للتقريب." },
      "no_changes_made": { en: "No changes were made as no new details were provided.", ar: "لم يتم إجراء أي تغييرات كونه لم يتم تقديم تفاصيل جديدة." },
      "all_slots_fully_booked": { en: "All slots are fully booked for this date. Please choose another date.", ar: "جميع المواعيد محجوزة. يرجى اختيار تاريخ آخر." },
      "all_reservations_cancelled": { en: "All reservations cancelled.", ar: "تم إلغاء جميع الحجوزات." },
      "reservation_cancelled": { en: "Reservation cancelled.", ar: "تم إلغاء الحجز." },
      "cannot_cancel_past_reservation": { en: "Cannot cancel past reservations. Reservation ID {id} is in the past.", ar: "لا يمكن إلغاء الحجوزات السابقة. الحجز رقم {id} في الماضي." },
      "no_future_reservations_on_date": { en: "No future reservations found on {date}. Cannot cancel past reservations.", ar: "لم يتم العثور على حجوزات مستقبلية في {date}. لا يمكن إلغاء الحجوزات السابقة." },
      "no_reservation_on_date": { en: "No reservations found on {date}.", ar: "لم يتم العثور على حجوزات في {date}." },
      "cancellation_failed_date": { en: "Failed to cancel reservations on {date}.", ar: "فشل في إلغاء الحجوزات في {date}." },
      "reservation_successful": { en: "Reservation successful.", ar: "تم الحجز بنجاح." },
      "reservation_modified": { en: "Reservation modified successfully.", ar: "تم تعديل الحجز بنجاح." },
      "no_new_details": { en: "No new details provided for modification.", ar: "لم يتم تقديم تفاصيل جديدة للتعديل." },
      "no_future_reservations": { en: "No upcoming reservations found to modify. Please reserve a new appointment.", ar: "لم يتم العثور على حجوزات قادمة للتعديل. الرجاء حجز موعد جديد." },
      "multiple_future_reservations": { en: "Multiple upcoming reservations found: {reservations}. You can only have one future reservation. Please cancel unused reservations.", ar: "تم العثور على حجوزات متعددة قادمة: {reservations}\nيمكنك أن تمتلك حجز مستقبلي واحد فقط. الرجاء إلغاء الحجوزات الغير مستعملة" },
      "customer_name_required": { en: "Customer name has to be provided.", ar: "يجب تقديم اسم العميل." },
      "no_reservations_found": { en: "No reservations found for the customer.", ar: "لم يتم العثور على حجوزات للعميل." },
      "reservation_not_found": { en: "Reservation not found for the specified date.", ar: "لم يتم العثور على حجز في التاريخ المحدد." },
      "reservation_not_found_id": { en: "Reservation with ID {id} not found.", ar: "لم يتم العثور على حجز بالمعرف {id}." },
      "no_actual_change_made": { en: "No actual changes were made to the reservation.", ar: "لم يتم إجراء أي تغييرات فعلية على الحجز." },
      "slot_unavailable_approx_not_impl": { en: "The requested slot is unavailable, and finding an approximate slot is not yet fully implemented.", ar: "الوقت المطلوب غير متاح، ولم يتم تنفيذ ميزة إيجاد وقت تقريبي بالكامل بعد." },
      "reservation_modified_successfully": { en: "Reservation modified successfully.", ar: "تم تعديل الحجز بنجاح." },
      "cancellation_failed_specific": { en: "Failed to cancel reservation with ID {id}. It might be already cancelled or not exist.", ar: "فشل إلغاء الحجز بالمعرف {id}. قد يكون ملغى بالفعل أو غير موجود." },
      "reservation_already_cancelled": { en: "Reservation with ID {id} is already cancelled.", ar: "الحجز بالمعرف {id} ملغى بالفعل." },
      "reservations_cancelled_successfully": { en: "{count} reservation(s) cancelled successfully.", ar: "تم إلغاء {count} حجز بنجاح." },
      "no_reservations_to_cancel": { en: "No active reservations found to cancel.", ar: "لم يتم العثور على حجوزات نشطة للإلغاء." },
      "reservation_reinstated": { en: "Reservation with ID {id} has been reinstated.", ar: "تمت إعادة تفعيل الحجز بالمعرف {id}." },
      "reservation_already_active": { en: "Reservation with ID {id} is already active.", ar: "الحجز بالمعرف {id} نشط بالفعل." },
      "reservation_reinstate_failed": { en: "Failed to reinstate reservation with ID {id}. It might not be in a cancellable state or an error occurred.", ar: "فشل إعادة تفعيل الحجز بالمعرف {id}. قد لا يكون في حالة قابلة للإلغاء أو حدث خطأ." },
      "reservation_cancelled_for_undo": { en: "Reservation with ID {id} has been cancelled (undone).", ar: "تم إلغاء الحجز بالمعرف {id} (تم التراجع)." },
      "customer_not_found_for_update": { en: "Customer with wa_id {wa_id} not found for update.", ar: "لم يتم العثور على عميل برقم الواتساب {wa_id} للتحديث." },
      "customer_name_no_change": { en: "Customer name is the same, no update performed.", ar: "اسم العميل مطابق، لم يتم إجراء تحديث." },
      "customer_name_updated": { en: "Customer name updated successfully.", ar: "تم تحديث اسم العميل بنجاح." },
      "customer_name_update_failed": { en: "Failed to update customer name.", ar: "فشل تحديث اسم العميل." },
      "cannot_select_past": { en: "Cannot select past time slots.", ar: "لا يمكن اختيار مواعيد سابقة." },
      "reservation_changed": { en: "Reservation changed.", ar: "تم تعديل الحجز." },
      "calendar_week_grid": { en: "Week Grid", ar: "شبكة الوقت" },
      "calendar_timeline": { en: "Timeline", ar: "الجدول الزمني" },
      "calendar_list": { en: "List", ar: "القائمة" },
      "calendar_multi_month": { en: "Multi-Month", ar: "عدة أشهر" },
      "vacation": { en: "Vacation", ar: "إجازة" },
      "conversation": { en: "Conversation: {name}", ar: "محادثة: {name}" },
      "user_deleted": { en: "User deleted successfully.", ar: "تم حذف المستخدم بنجاح." },
      "vacation_periods_updated": { en: "Vacation periods updated successfully", ar: "تم تحديث فترات الإجازة بنجاح" },
      "vacation_periods_update_failed": { en: "Failed to update vacation periods", ar: "فشل في تحديث فترات الإجازة" },
      "vacation_period_added": { en: "Vacation period added successfully", ar: "تمت إضافة فترة الإجازة بنجاح" },
      "vacation_period_removed": { en: "Vacation period removed successfully", ar: "تم حذف فترة الإجازة بنجاح" },
      "vacation_period_modified": { en: "Vacation period modified successfully", ar: "تم تعديل فترة الإجازة بنجاح" },
      "vacation_update_undone": { en: "Vacation update has been undone", ar: "تم التراجع عن تحديث الإجازة" },
      "vacation_undo_failed": { en: "Failed to undo vacation update", ar: "فشل في التراجع عن تحديث الإجازة" },
      "undo": { en: "Undo", ar: "تراجع" },
      "undone": { en: "Undone", ar: "تم التراجع" }
    }

    return NextResponse.json({ success: true, data: translations })
  } catch (error) {
    console.error('Error fetching translations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch translations' }, { status: 500 })
  }
} 