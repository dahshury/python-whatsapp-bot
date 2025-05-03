# Internationalization resource for messages

# Supported messages and their translations
MESSAGES = {
    # General system errors
    "system_error_try_later": {"en": "System error occurred. try again later.", "ar": "حدث خطأ في النظام. حاول مرة أخرى لاحقًا."},
    "system_error_generic": {"en": "An unexpected error occurred: {error}. Please try again later.", "ar": "حدث خطأ غير متوقع: {error}. حاول مرة أخرى لاحقًا."},
    "invalid_date_format": {"en": "Invalid date format: {error}", "ar": "تنسيق تاريخ غير صالح: {error}"},
    "past_date_error": {"en": "Cannot schedule for past dates.", "ar": "لا يمكنك الجدولة لتواريخ ماضية."},
    "system_error_contact_secretary": {"en": "System error occurred. Ask user to contact the secretary to reserve.", "ar": "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز."},
    "non_working_day": {"en": "The clinic is closed on this day.", "ar": "العيادة مغلقة في هذا اليوم."},
    
    # send_business_location
    "location_sent": {"en": "Location sent.", "ar": "تم إرسال الموقع."},
    
    # get_current_datetime
    # No user-facing messages beyond data fields
    
    # modify_id
    "wa_id_same": {"en": "The new wa_id is the same as the old wa_id.", "ar": "رقم الواتساب الجديد هو نفسه رقم الواتساب القديم."},
    "wa_id_modified": {"en": "wa_id modified successfully.", "ar": "تم تعديل رقم الواتساب بنجاح."},
    
    # Reservation errors
    "invalid_date": {"en": "Invalid date format.", "ar": "تاريخ غير صالح."},
    "invalid_time": {"en": "Invalid time format.", "ar": "صيغة الوقت غير صالحة."},
    "cannot_reserve_past": {"en": "Cannot reserve in the past.", "ar": "لا يمكنك الحجز في الماضي."},
    "reservation_failed_slot": {"en": "Reservation failed. The selected time slot ({slot}) is not available. Available slots: {slots}", "ar": "فشل الحجز. الوقت الذي تم اختياره ({slot}) غير متاح. الأوقات المتاحة: {slots}"},
    "slot_fully_booked": {"en": "This time slot is fully booked. Please choose another slot.", "ar": "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."},
    "phone_length_error": {"en": "Phone number length is invalid (should be between 8-15 digits).", "ar": "طول رقم الهاتف غير صالح (يجب أن يكون بين 8-15 رقمًا)."},
    "phone_format_error": {"en": "Invalid phone number format.", "ar": "صيغة رقم الهاتف غير صالحة."},
    "phone_invalid": {"en": "Invalid phone number: {error}", "ar": "رقم الهاتف غير صالح: {error}"},
    "phone_validation_error": {"en": "Phone validation error.", "ar": "خطأ في التحقق من صحة رقم الهاتف."},
    "invalid_reservation_type": {"en": "Invalid reservation type. Must be 0 or 1.", "ar": "نوع الحجز غير صالح. يجب أن يكون 0 أو 1."},
    "no_slots_available_approx": {"en": "No available time slot found for approximation.", "ar": "لم يتم العثور على موعد متاح للتقريب."},
    "no_changes_made": {"en": "No changes were made as no new details were provided.", "ar": "لم يتم إجراء أي تغييرات كونه لم يتم تقديم تفاصيل جديدة."},
    "all_slots_fully_booked": {"en": "All slots are fully booked for this date. Please choose another date.", "ar": "جميع المواعيد محجوزة. يرجى اختيار تاريخ آخر."},
    # cancel_reservation
    "all_reservations_cancelled": {"en": "All reservations cancelled.", "ar": "تم إلغاء جميع الحجوزات."},
    "reservation_cancelled": {"en": "Reservation cancelled.", "ar": "تم إلغاء الحجز."},
    
    # reserve_time_slot success
    "reservation_successful": {"en": "Reservation successful.", "ar": "تم الحجز بنجاح."},
    
    # modify_reservation success
    "reservation_modified": {"en": "Reservation modified successfully.", "ar": "تم تعديل الحجز بنجاح."},
    
    # get_customer_reservations
    # data-only, no messages
    
    # search_available_appointments
    # data-only, no messages
    
    # modify_reservation early errors
    "no_new_details": {"en": "No new details provided for modification.", "ar": "لم يتم تقديم تفاصيل جديدة للتعديل."},
    "no_future_reservations": {"en": "No upcoming reservations found to modify. Please reserve a new appointment.", "ar": "لم يتم العثور على حجوزات قادمة للتعديل. الرجاء حجز موعد جديد."},
    "multiple_future_reservations": {"en": "Multiple upcoming reservations found: {reservations}. You can only have one future reservation. Please cancel unused reservations.", "ar": "تم العثور على حجوزات متعددة قادمة: {reservations}\nيمكنك أن تمتلك حجز مستقبلي واحد فقط. الرجاء إلغاء الحجوزات الغير مستعملة"},
    
    # reserve_time_slot early error
    "customer_name_required": {"en": "Customer name has to be provided.", "ar": "يجب تقديم اسم العميل."},
    
    # cancel_reservation early errors
    "no_reservations_found": {"en": "No reservations found for the customer.", "ar": "لم يتم العثور على حجوزات للعميل."},
    "reservation_not_found": {"en": "Reservation not found for the specified date.", "ar": "لم يتم العثور على حجز في التاريخ المحدد."},
    
    # Calendar view messages
    "cannot_select_past": {"en": "Cannot select past time slots.", "ar": "لا يمكن اختيار مواعيد سابقة."},
    "reservation_changed": {"en": "Reservation changed.", "ar": "تم تعديل الحجز."},
    
    # Calendar view UI elements
    "calendar_week_grid": {"en": "Week Grid", "ar": "شبكة الوقت"},
    "calendar_timeline": {"en": "Timeline", "ar": "الجدول الزمني"},
    "calendar_list": {"en": "List", "ar": "القائمة"},
    "calendar_multi_month": {"en": "Multi-Month", "ar": "عدة أشهر"},
    "vacation": {"en": "Vacation", "ar": "إجازة"},
    "conversation": {"en": "Conversation: {name}", "ar": "محادثة: {name}"},
    
    # delete_user
    "user_deleted": {"en": "User deleted successfully.", "ar": "تم حذف المستخدم بنجاح."},
}


def get_message(key: str, ar: bool = False, **kwargs) -> str:
    """
    Retrieve a translated message by key and optional formatting.
    :param key: message identifier
    :param ar: whether to return Arabic translation (True) or English (False)
    :param kwargs: formatting arguments for message templates
    """
    entry = MESSAGES.get(key, {})
    text = entry.get("ar" if ar else "en", "")
    if kwargs:
        try:
            text = text.format(**kwargs)
        except Exception:
            pass
    return text 