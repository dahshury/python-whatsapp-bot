const en = {
	system_error_try_later: "System error, please try again later",
	chat_type_message: "Type a message...",
	chat_no_conversation: "Select a conversation to start chatting",
	chat_no_messages: "No messages in this conversation yet",
	chat_start_conversation: "Start the conversation by sending a message",
	chat_cannot_message_no_conversation:
		"You can't send messages to users who haven't started a conversation",
	chat_messaging_unavailable: "Messaging unavailable after 24h inactivity",
	chat_loading_conversation: "Loading conversation...",
	chat_loading_conversations: "Loading conversations...",
	chat_select_conversation: "Select a conversation",
	chat_no_conversations: "No conversations available",
	chat_message_sent: "Message sent",
	chat_message_failed: "Failed to send message",
	// Dashboard basics
	dashboard_title: "Dashboard",
	dashboard_subtitle: "Overview of your reservation and messaging performance",
	dashboard_error_title: "Unable to load dashboard",
	dashboard_try_again: "Try again",
	dashboard_overview: "Overview",
	dashboard_trends: "Trends",
	dashboard_messages: "Messages",
	dashboard_insights: "Insights",
	dashboard_days: "days",
	dashboard_reservations: "reservations",
	dashboard_select_date_range: "Select date range",
	dashboard_seven_days: "7 days",
	dashboard_thirty_days: "30 days",
	dashboard_export: "Export",
	// KPI cards
	kpi_total_reservations: "Total Reservations",
	kpi_from_last_month: "from last month",
	kpi_active_customers: "Active Customers",
	kpi_unique_customers: "Unique customers",
	kpi_cancellations: "Cancellations",
	kpi_this_period: "this period",
	kpi_conversion_rate: "Conversion Rate",
	kpi_conversation_to_booking: "Conversation to booking",
	kpi_returning_rate: "Returning Rate",
	kpi_customer_retention: "Customer retention",
	kpi_improvement: "improvement",
	kpi_avg_response_time: "Avg Response Time",
	kpi_returning_customers: "Returning Customers",
	kpi_avg_followups: "Avg Follow-ups",
	kpi_performance_metrics: "Performance Metrics",
	kpi_total_reservations_tooltip:
		"Total reservations in selected period vs previous similar period",
	kpi_active_customers_desc: "Customers with upcoming reservations",
	kpi_active_customers_tooltip:
		"Customers who have at least one future-dated reservation",
	kpi_cancellations_tooltip:
		"Cancellations within selected period vs previous similar period",
	kpi_avg_response_time_tooltip:
		"Average time for assistant to reply to customer (customer→assistant) vs previous period",
	kpi_avg_followups_tooltip:
		"Average additional follow-up bookings per returning customer vs previous period",
	kpi_unique_customers_tooltip:
		"Customers whose first reservation occurred in this period vs previous similar period",
	// System metrics
	kpi_cpu_usage: "CPU Usage",
	kpi_current_usage: "Current usage",
	kpi_demo_data: "Demo data",
	kpi_memory_usage: "Memory Usage",
	kpi_success_rate: "Success Rate",
	kpi_operational_rate: "Operational rate",
	tooltip_success_rate: "Success rate calculated from operation metrics",
	// Ops section
	operation_metrics_title: "Operation Metrics",
	operation_attempts: "Attempts",
	operation_success: "Success",
	operation_failed: "Failed",
	operation_reservations: "Reservations",
	operation_cancellations: "Cancellations",
	operation_modifications: "Modifications",
	// Response time
	response_time_analysis_title: "Response Time Analysis",
	response_time_score: "Score",
	response_time_average: "Average",
	response_time_median: "Median",
	response_time_maximum: "Maximum",
	response_time_performance: "Response time performance",
	response_time_performance_desc: "Lower is better",
	response_time_slow: "Slow",
	response_time_fast: "Fast",
	response_time_insights: "Response time performance insights",
	response_time_excellent: "Excellent response time",
	response_time_good: "Good response time",
	response_time_needs_improvement: "Needs improvement",
	response_time_poor: "Poor response time",
	// Misc common
	msg_minutes: "min",
	msg_messages: "Messages",
	msg_page: "Page",
	msg_of: "of",
	msg_total: "Total",
	msg_previous: "Previous",
	msg_next: "Next",
	// Vacation label
	vacation: "Vacation",
	// Phone combobox
	phone_country_search_placeholder: "Search countries...",
	phone_no_country_found: "No country found.",
	phone_search_placeholder: "Search phone numbers...",
	phone_no_phone_found: "No phone number found.",
	phone_add_number_label: 'Add "{value}" as new phone number',
	phone_select_placeholder: "Select a phone number",
	// Column/format menus
	cm_sort_asc: "Sort ascending",
	cm_sort_desc: "Sort descending",
	cm_pin_column: "Pin column",
	cm_unpin_column: "Unpin column",
	cm_hide_column: "Hide column",
	cm_autosize_column: "Autosize column",
	cm_format: "Format",
	cm_format_automatic: "Automatic",
	cm_format_localized: "Localized",
	cm_format_percentage: "Percentage",
	cm_format_scientific: "Scientific",
	cm_format_accounting: "Accounting",
	cm_format_distance: "Distance",
	cm_format_calendar: "Calendar",
};

const ar = {
	system_error_try_later: "خطأ بالنظام، حاول لاحقًا",
	chat_type_message: "اكتب رسالة...",
	chat_no_conversation: "اختر محادثة لبدء الدردشة",
	chat_no_messages: "لا توجد رسائل في هذه المحادثة بعد",
	chat_start_conversation: "ابدأ المحادثة بإرسال رسالة",
	chat_cannot_message_no_conversation:
		"لا يمكنك إرسال رسائل إلى العملاء الذين لم يبدأوا محادثة",
	chat_messaging_unavailable: "التراسل غير متاح بعد ٢٤ ساعة من الخمول",
	chat_loading_conversation: "جارٍ تحميل المحادثة...",
	chat_loading_conversations: "جارٍ تحميل المحادثات...",
	chat_select_conversation: "اختر محادثة",
	chat_no_conversations: "لا توجد محادثات",
	chat_message_sent: "تم إرسال الرسالة",
	chat_message_failed: "فشل إرسال الرسالة",
	// Phone combobox
	phone_country_search_placeholder: "ابحث عن الدول...",
	phone_no_country_found: "لا توجد دولة.",
	phone_search_placeholder: "ابحث عن أرقام الهواتف...",
	phone_no_phone_found: "لا يوجد رقم هاتف.",
	phone_add_number_label: 'إضافة "{value}" كرقم هاتف جديد',
	phone_select_placeholder: "اختر رقم هاتف",
	// Phone validation error messages
	phoneFormatNotRecognized: "تنسيق رقم الهاتف غير معروف",
	phoneHasInvalidCountryCode: "رمز الدولة غير صالح",
	phoneContainsInvalidCharacters: "رقم الهاتف يحتوي على أحرف غير صالحة",
	phoneIsTooShort: "رقم الهاتف قصير جداً",
	phoneIsTooLong: "رقم الهاتف طويل جداً",
	phoneHasInvalidLengthForCountry: "طول رقم الهاتف غير صالح لهذه الدولة",
	phoneInvalidFormat: "تنسيق رقم الهاتف غير صالح",
	phoneMayHaveInvalidAreaCode: "قد يحتوي على رمز منطقة غير صالح",
	phoneFormatIsInvalid: "تنسيق رقم الهاتف غير صحيح",
	// Dashboard
	dashboard_title: "لوحة التحكم",
	dashboard_subtitle: "نظرة عامة على الأداء والحجوزات والرسائل",
	dashboard_overview: "نظرة عامة",
	dashboard_trends: "الاتجاهات",
	dashboard_messages: "الرسائل",
	dashboard_insights: "الإحصاءات",
	dashboard_days: "أيام",
	dashboard_reservations: "حجوزات",
	dashboard_select_date_range: "اختر نطاق التاريخ",
	dashboard_seven_days: "7 أيام",
	dashboard_thirty_days: "30 يومًا",
	dashboard_export: "تصدير",
	// Vacation label
	vacation: "إجازة",
};

// Extend English keys for charts, messages, operations, insights
Object.assign(en, {
	chart_daily_trends_overview: "Daily Trends",
	chart_no_data: "No data available",
	chart_showing_all_data: "Showing all data",
	chart_showing_last_days: "Showing last days",
	chart_appointment_type_distribution: "Appointment Type Distribution",
	chart_popular_time_slots: "Popular Time Slots",
	chart_weekly_activity_pattern: "Weekly Activity Pattern",
	chart_monthly_performance_trends: "Monthly Performance Trends",
	chart_conversion_funnel: "Conversion Funnel",
	chart_conversion_funnel_desc: "Conversation to booking progression",
	chart_customer_segments: "Customer Segments",
	msg_total_messages: "Total Messages",
	msg_avg_message_length: "Avg Message Length",
	msg_chars: "chars",
	msg_words_avg: "words avg",
	msg_minutes: "min",
	msg_median: "median",
	msg_messages_per_customer: "Messages per Customer",
	msg_volume_heatmap: "Message Volume Heatmap",
	msg_activity_patterns: "Activity patterns by day and hour",
	msg_customers: "Customers",
	msg_assistant: "Assistant",
	msg_less: "Less",
	msg_more: "More",
});

Object.assign(ar, {
	chart_daily_trends_overview: "الاتجاهات اليومية",
	chart_no_data: "لا توجد بيانات",
	chart_showing_all_data: "عرض جميع البيانات",
	chart_showing_last_days: "عرض آخر الأيام",
	chart_appointment_type_distribution: "توزيع أنواع المواعيد",
	chart_popular_time_slots: "الأوقات الأكثر شيوعاً",
	chart_weekly_activity_pattern: "نمط النشاط الأسبوعي",
	chart_monthly_performance_trends: "اتجاهات الأداء الشهرية",
	chart_conversion_funnel: "قمع التحويل",
	chart_conversion_funnel_desc: "انتقال المحادثة إلى الحجز",
	chart_customer_segments: "شرائح العملاء",
	msg_total_messages: "إجمالي الرسائل",
	msg_avg_message_length: "متوسط طول الرسالة",
	msg_chars: "حرف",
	msg_words_avg: "كلمات وسطياً",
	msg_minutes: "د",
	msg_median: "الوسيط",
	msg_messages_per_customer: "رسائل لكل عميل",
	msg_volume_heatmap: "خريطة كثافة الرسائل",
	msg_activity_patterns: "أنماط النشاط حسب اليوم والساعة",
	msg_customers: "العملاء",
	msg_assistant: "المساعد",
	msg_less: "أقل",
	msg_more: "أكثر",
});

// Extend English with additional dashboard and analysis keys
Object.assign(en, {
	chart_all_data: "All data",
	chart_last_30_days: "Last 30 days",
	chart_last_14_days: "Last 14 days",
	chart_last_7_days: "Last 7 days",
	appt_checkup: "Checkup",
	appt_followup: "Follow-up",
	slot_regular: "Regular",
	slot_saturday: "Saturday",
	slot_ramadan: "Ramadan",
	slot_unknown: "Unknown",
	funnel_conversations: "Conversations",
	funnel_made_reservation: "Made reservation",
	funnel_returned_for_another: "Returned for another",
	funnel_cancelled: "Cancelled",
	segment_new_1_visit: "New (1 visit)",
	segment_returning_2_5_visits: "Returning (2-5 visits)",
	segment_loyal_6_plus_visits: "Loyal (6+ visits)",
	segment_new_customers: "New customers",
	segment_regular_customers: "Regular customers",
	segment_vip_customers: "VIP customers",
	segment_inactive_customers: "Inactive customers",
	day_monday: "Monday",
	day_tuesday: "Tuesday",
	day_wednesday: "Wednesday",
	day_thursday: "Thursday",
	day_friday: "Friday",
	day_saturday: "Saturday",
	day_sunday: "Sunday",
	day_mon: "Mon",
	day_tue: "Tue",
	day_wed: "Wed",
	day_thu: "Thu",
	day_fri: "Fri",
	day_sat: "Sat",
	day_sun: "Sun",
	msg_across_all_conversations: "Across all conversations",
	msg_avg_response_time: "Avg Response Time",
	msg_average_conversation_length: "Average Conversation Length",
	msg_most_active_customers: "Most Active Customers",
	msg_last: "Last",
	msg_msgs: "msgs",
	msg_bookings: "Bookings",
	msg_most_common_words: "Most Common Words",
	msg_peak_messages: "Peak Messages",
	msg_peak_hour: "Peak Hour",
	msg_busiest_day: "Busiest Day",
	msg_avg_per_hour: "Avg/Hour",
	msg_customer_words: "Customer Words",
	msg_assistant_words: "Assistant Words",
	msg_total_usage: "Total Usage",
	msg_morning: "Morning",
	msg_afternoon: "Afternoon",
	msg_evening: "Evening",
	msg_no_messages: "No messages",
	msg_very_low: "Very Low",
	msg_low: "Low",
	msg_medium: "Medium",
	msg_high: "High",
	msg_very_high: "Very High",
	msg_activity: "activity",
	// KPI extras
	kpi_customers_with_multiple_bookings: "Customers With Multiple Bookings",
	kpi_additional_bookings_per_returning_customer:
		"Additional Bookings Per Returning Customer",
	// Conversation analysis strings
	conversation_analysis_title: "Conversation Analysis",
	conversation_length_average: "Conversation Length Average",
	conversation_length_median: "Conversation Length Median",
	conversation_length_maximum: "Conversation Length Maximum",
	conversation_per_customer: "Conversation Per Customer",
	conversation_overview: "Conversation Overview",
	msg_unique_customers: "Unique Customers",
	conversation_avg_per_customer: "Conversation Avg Per Customer",
	conversation_engagement: "Conversation Engagement",
	conversation_engagement_level: "Conversation Engagement Level",
	engagement_high: "Engagement High",
	engagement_medium: "Engagement Medium",
	engagement_low: "Engagement Low",
	response_time_avg_desc: "Average response time across conversations",
	response_time_median_desc: "Median response time across conversations",
	response_time_max_desc: "Longest response time recorded",
	response_time_calculated: "Calculated",
	dashboard_demo_mode: "Demo Mode",
	dashboard_demo_description:
		"You are viewing demo data. Connect the backend to load real data.",
	demo_data_warning: "Demo Data Warning",
	real_data_available: "Real Data Available",
	dashboard_business_insights: "Business Insights",
	dashboard_peak_hours_title: "Peak Hours",
	dashboard_peak_hours_desc: "Hours with the highest messaging activity",
	dashboard_customer_retention_title: "Customer Retention",
	dashboard_response_time_title: "Response Time",
	backend_connection_error_title: "Cannot connect to backend",
	backend_connection_error_description:
		"We couldn't reach the Python backend. Ensure it's running and reachable.",
	backend_connection_error_instructions:
		"Click retry after confirming the server is up.",
	backend_connection_checking: "Checking connection...",
	backend_connection_error_retry: "Retry",
	// Toast notifications
	toast_reservation_created: "Reservation created",
	toast_reservation_modified: "Reservation modified",
	toast_reservation_cancelled: "Reservation cancelled",
	toast_reservation_modification_failed: "Reservation modification failed",
	toast_error_prefix: "Error",
	toast_new_message: "Message",
	toast_request_timeout: "Request timed out",
	// Error messages
	slot_fully_booked:
		"This time slot is fully booked. Please choose another slot.",
	// Validation popover messages
	validation_issues: "Validation Issues",
	validation_issues_details: "Please fix these issues before saving",
	row: "Row",
	// Field labels
	field_scheduled_time: "Scheduled Time",
	field_phone: "Phone",
	field_type: "Type",
	field_name: "Name",
});

// Column/format menus localization
Object.assign(en, {
	cm_sort_asc: "Sort ascending",
	cm_sort_desc: "Sort descending",
	cm_pin_column: "Pin column",
	cm_unpin_column: "Unpin column",
	cm_hide_column: "Hide column",
	cm_autosize_column: "Autosize column",
	cm_format: "Format",
	cm_format_automatic: "Automatic",
	cm_format_localized: "Localized",
	cm_format_percentage: "Percentage",
	cm_format_scientific: "Scientific",
	cm_format_accounting: "Accounting",
	cm_format_distance: "Distance",
	cm_format_calendar: "Calendar",
});

// Theme mode labels
Object.assign(en, {
	theme_mode_system: "System",
	theme_mode_light: "Light",
	theme_mode_dark: "Dark",
});

// Extend Arabic with additional dashboard and analysis keys
Object.assign(ar, {
	chart_all_data: "كل البيانات",
	chart_last_30_days: "آخر 30 يوماً",
	chart_last_14_days: "آخر 14 يوماً",
	chart_last_7_days: "آخر 7 أيام",
	appt_checkup: "كشف",
	appt_followup: "متابعة",
	slot_regular: "عادي",
	slot_saturday: "السبت",
	slot_ramadan: "رمضان",
	slot_unknown: "غير معروف",
	funnel_conversations: "المحادثات",
	funnel_made_reservation: "تم إجراء حجز",
	funnel_returned_for_another: "عاد لحجز آخر",
	funnel_cancelled: "ملغاة",
	segment_new_1_visit: "جدد (زيارة واحدة)",
	segment_returning_2_5_visits: "عائدون (2-5 زيارات)",
	segment_loyal_6_plus_visits: "مخلصون (6+ زيارات)",
	segment_new_customers: "عملاء جدد",
	segment_regular_customers: "عملاء دائمون",
	segment_vip_customers: "عملاء مميزون",
	segment_inactive_customers: "عملاء غير نشطين",
	day_monday: "الاثنين",
	day_tuesday: "الثلاثاء",
	day_wednesday: "الأربعاء",
	day_thursday: "الخميس",
	day_friday: "الجمعة",
	day_saturday: "السبت",
	day_sunday: "الأحد",
	day_mon: "الإث",
	day_tue: "الث",
	day_wed: "الأر",
	day_thu: "الخ",
	day_fri: "الجم",
	day_sat: "السب",
	day_sun: "الأح",
	kpi_total_reservations: "إجمالي الحجوزات",
	kpi_from_last_month: "من الشهر الماضي",
	kpi_active_customers: "العملاء النشطون",
	kpi_unique_customers: "عملاء مميزون",
	kpi_cancellations: "الإلغاءات",
	kpi_this_period: "خلال هذه الفترة",
	kpi_conversion_rate: "معدل التحويل",
	kpi_conversation_to_booking: "من محادثة إلى حجز",
	kpi_returning_rate: "معدل العودة",
	kpi_customer_retention: "الاحتفاظ بالعملاء",
	kpi_improvement: "تحسن",
	kpi_avg_response_time: "متوسط زمن الاستجابة",
	kpi_returning_customers: "العملاء العائدون",
	kpi_avg_followups: "متوسط المتابعات",
	kpi_performance_metrics: "مؤشرات الأداء",
	kpi_total_reservations_tooltip:
		"إجمالي الحجوزات في الفترة المحددة مقارنة بالفترة السابقة المشابهة",
	kpi_active_customers_desc: "عملاء لديهم حجوزات قادمة",
	kpi_active_customers_tooltip:
		"العملاء الذين لديهم حجز واحد على الأقل بتاريخ مستقبلي",
	kpi_cancellations_tooltip:
		"الإلغاءات خلال الفترة المحددة مقارنة بالفترة السابقة المشابهة",
	kpi_avg_response_time_tooltip:
		"متوسط زمن رد المساعد على العميل (عميل→مساعد) مقارنة بالفترة السابقة",
	kpi_avg_followups_tooltip:
		"متوسط الحجوزات الإضافية للمتابعات لكل عميل عائد مقارنة بالفترة السابقة",
	kpi_unique_customers_tooltip:
		"العملاء الذين كانت أول حجز لهم خلال هذه الفترة مقارنة بفترة سابقة مشابهة",
	kpi_cpu_usage: "استخدام المعالج",
	kpi_current_usage: "الاستخدام الحالي",
	kpi_demo_data: "بيانات تجريبية",
	kpi_memory_usage: "استخدام الذاكرة",
	kpi_success_rate: "معدل النجاح",
	kpi_operational_rate: "معدل التشغيل",
	tooltip_success_rate: "معدل النجاح محسوب من مؤشرات العمليات",
	response_time_calculated: "محسوب",
	operation_metrics_title: "مؤشرات العمليات",
	operation_attempts: "محاولات",
	operation_success: "نجاح",
	operation_failed: "فشل",
	operation_reservations: "حجوزات",
	operation_cancellations: "إلغاءات",
	operation_modifications: "تعديلات",
	response_time_average: "المتوسط",
	response_time_median: "الوسيط",
	response_time_maximum: "الحد الأقصى",
	response_time_performance: "أداء زمن الاستجابة",
	response_time_performance_desc: "الأقل أفضل",
	response_time_insights: "رؤى أداء زمن الاستجابة",
	response_time_excellent: "زمن استجابة ممتاز",
	response_time_good: "زمن استجابة جيد",
	response_time_needs_improvement: "بحاجة إلى تحسين",
	response_time_poor: "زمن استجابة ضعيف",
	response_time_avg_desc: "متوسط زمن الاستجابة عبر المحادثات",
	response_time_median_desc: "الوسيط لزمن الاستجابة عبر المحادثات",
	response_time_max_desc: "أطول زمن استجابة مسجّل",
	msg_across_all_conversations: "عبر جميع المحادثات",
	msg_avg_response_time: "متوسط زمن الاستجابة",
	msg_average_conversation_length: "متوسط طول المحادثة",
	msg_most_active_customers: "أكثر العملاء نشاطاً",
	msg_last: "آخر",
	msg_msgs: "رسائل",
	msg_bookings: "حجوزات",
	msg_most_common_words: "الكلمات الأكثر شيوعاً",
	msg_peak_messages: "أقصى عدد رسائل",
	msg_peak_hour: "ساعة الذروة",
	msg_busiest_day: "أكثر يوم ازدحاماً",
	msg_avg_per_hour: "متوسط/ساعة",
	msg_customer_words: "كلمات العملاء",
	msg_assistant_words: "كلمات المساعد",
	msg_total_usage: "الاستخدام الكلي",
	msg_morning: "صباحاً",
	msg_afternoon: "بعد الظهر",
	msg_evening: "مساءً",
	msg_no_messages: "لا رسائل",
	msg_very_low: "منخفض جداً",
	msg_low: "منخفض",
	msg_medium: "متوسط",
	msg_high: "مرتفع",
	msg_very_high: "مرتفع جداً",
	msg_activity: "نشاط",
	// KPI extras
	kpi_customers_with_multiple_bookings: "عملاء لديهم حجوزات متعددة",
	kpi_additional_bookings_per_returning_customer: "حجوزات إضافية لكل عميل عائد",
	// Conversation analysis strings
	conversation_analysis_title: "تحليل المحادثات",
	conversation_length_average: "متوسط طول المحادثة",
	conversation_length_median: "الوسيط لطول المحادثة",
	conversation_length_maximum: "الحد الأقصى لطول المحادثة",
	conversation_per_customer: "محادثات لكل عميل",
	conversation_overview: "نظرة عامة على المحادثات",
	msg_unique_customers: "عملاء فريدون",
	conversation_avg_per_customer: "متوسط المحادثات لكل عميل",
	conversation_engagement: "مستوى التفاعل في المحادثات",
	conversation_engagement_level: "مستوى التفاعل",
	engagement_high: "تفاعل مرتفع",
	engagement_medium: "تفاعل متوسط",
	engagement_low: "تفاعل منخفض",
	dashboard_error_title: "تعذر تحميل لوحة التحكم",
	dashboard_try_again: "حاول مجدداً",
	dashboard_demo_mode: "وضع العرض التجريبي",
	dashboard_demo_description:
		"أنت تشاهد بيانات تجريبية. صِل بالخادم الخلفي لتحميل البيانات الحقيقية.",
	demo_data_warning: "تحذير بيانات تجريبية",
	real_data_available: "بيانات حقيقية متاحة",
	dashboard_business_insights: "رؤى الأعمال",
	dashboard_peak_hours_title: "ساعات الذروة",
	dashboard_peak_hours_desc: "الساعات ذات أعلى نشاط للرسائل",
	dashboard_customer_retention_title: "الاحتفاظ بالعملاء",
	dashboard_response_time_title: "زمن الاستجابة",
	backend_connection_error_title: "تعذر الاتصال بالخادم الخلفي",
	backend_connection_error_description:
		"لم نتمكن من الوصول إلى خادم بايثون. يرجى التأكد من تشغيله وإمكانية الوصول إليه.",
	backend_connection_error_instructions:
		"انقر إعادة المحاولة بعد التأكد من تشغيل الخادم.",
	backend_connection_checking: "جارٍ التحقق من الاتصال...",
	backend_connection_error_retry: "إعادة المحاولة",
	// Toast notifications
	toast_reservation_created: "تم إنشاء الحجز",
	toast_reservation_modified: "تم تعديل الحجز",
	toast_reservation_cancelled: "تم إلغاء الحجز",
	toast_reservation_modification_failed: "فشل تعديل الحجز",
	toast_error_prefix: "خطأ",
	toast_new_message: "رسالة",
	toast_request_timeout: "انتهت مهلة الطلب",
	// Error messages
	slot_fully_booked: "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر.",
	// Validation popover messages
	validation_issues: "مشاكل التحقق",
	validation_issues_details: "يرجى إصلاح هذه المشاكل قبل الحفظ",
	row: "الصف",
	// Field labels
	field_scheduled_time: "الوقت المحدد",
	field_phone: "الهاتف",
	field_type: "النوع",
	field_name: "الاسم",
});

// Column/format menus localization
Object.assign(ar, {
	cm_sort_asc: "ترتيب تصاعدي",
	cm_sort_desc: "ترتيب تنازلي",
	cm_pin_column: "تثبيت العمود",
	cm_unpin_column: "إلغاء تثبيت العمود",
	cm_hide_column: "إخفاء العمود",
	cm_autosize_column: "تحجيم تلقائي",
	cm_format: "تنسيق",
	cm_format_automatic: "تلقائي",
	cm_format_localized: "محلي",
	cm_format_percentage: "نسبة مئوية",
	cm_format_scientific: "علمي",
	cm_format_accounting: "محاسبي",
	cm_format_distance: "المسافة",
	cm_format_calendar: "التقويم",
});

// Theme mode labels
Object.assign(ar, {
	theme_mode_system: "النظام",
	theme_mode_light: "فاتح",
	theme_mode_dark: "داكن",
});

const isLocalized = () => {
	if (typeof window === "undefined") return false;
	try {
		const loc = localStorage.getItem("locale");
		if (loc && loc !== "en") return true;
		return localStorage.getItem("isLocalized") === "true";
	} catch {
		return false;
	}
};

export const messages = {
	validation: {
		// Generic required message with field name
		required: (field: string) =>
			isLocalized() ? `${field} مطلوب` : `${field} is required`,
		// When field name is not known
		thisFieldIsRequired: () =>
			isLocalized() ? "هذا الحقل مطلوب" : "This field is required",
		// Formats / validity
		invalidFormat: () => (isLocalized() ? "تنسيق غير صالح" : "Invalid format"),
		invalidDate: () => (isLocalized() ? "تاريخ غير صالح" : "Invalid date"),
		invalidTime: () => (isLocalized() ? "وقت غير صالح" : "Invalid time"),
		invalidPhone: () =>
			isLocalized() ? "رقم هاتف غير صالح" : "Invalid phone number",
		phoneFormatNotRecognized: () =>
			isLocalized()
				? "تنسيق رقم الهاتف غير معروف"
				: "Phone format not recognized",
		phoneHasInvalidCountryCode: () =>
			isLocalized() ? "رمز الدولة غير صالح" : "Invalid country code",
		phoneContainsInvalidCharacters: () =>
			isLocalized()
				? "رقم الهاتف يحتوي على أحرف غير صالحة"
				: "Phone number contains invalid characters",
		phoneIsTooShort: () =>
			isLocalized() ? "رقم الهاتف قصير جداً" : "Phone number is too short",
		phoneIsTooLong: () =>
			isLocalized() ? "رقم الهاتف طويل جداً" : "Phone number is too long",
		phoneHasInvalidLengthForCountry: () =>
			isLocalized()
				? "طول رقم الهاتف غير صالح لهذه الدولة"
				: "Phone number length is invalid for this country",
		phoneInvalidFormat: () =>
			isLocalized()
				? "تنسيق رقم الهاتف غير صالح"
				: "Invalid phone number format",
		phoneMayHaveInvalidAreaCode: () =>
			isLocalized()
				? "قد يحتوي على رمز منطقة غير صالح"
				: "May have invalid area code",
		phoneFormatIsInvalid: () =>
			isLocalized()
				? "تنسيق رقم الهاتف غير صحيح"
				: "Phone number format is invalid",
		invalidName: () => (isLocalized() ? "اسم غير صالح" : "Invalid name"),
		// Name-specific messages
		nameRequired: () => (isLocalized() ? "الاسم مطلوب" : "Name is required"),
		nameTooShort: () =>
			isLocalized()
				? "يجب أن يتكون الاسم من كلمتين على الأقل"
				: "At least two words",
		nameInvalidCharacters: () =>
			isLocalized()
				? "الاسم يحتوي على أحرف غير صالحة"
				: "Name contains invalid characters",
		nameWordsTooShort: () =>
			isLocalized()
				? "كل كلمة يجب أن تحتوي على حرفين على الأقل"
				: "Each word must be at least 2 characters",
		nameTooLong: () => (isLocalized() ? "الاسم طويل جداً" : "Name is too long"),
	},
	grid: {
		none: () => (isLocalized() ? "لا يوجد" : "None"),
	},
	en,
	ar,
} as const;

export const i18n = {
	t: (key: string, fallback?: string) => fallback ?? key,
	getMessage: (key: string, isLocalizedArg?: boolean): string => {
		const dict = isLocalizedArg ? ar : en;
		const direct = (dict as Record<string, string>)[key];
		if (typeof direct === "string") return direct;

		// Humanized fallback for unknown keys, e.g. "kpi_conversion_rate" -> "Conversion Rate"
		const humanize = (raw: string) => {
			const stripped = raw
				.replace(
					/^(kpi_|msg_|chart_|dashboard_|response_time_|operation_|segment_|funnel_|day_|slot_)/,
					"",
				)
				.replace(/_/g, " ")
				.trim();
			return stripped
				.split(" ")
				.filter(Boolean)
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ");
		};
		return humanize(key);
	},
	messages,
};

// Extend dictionaries with calendar strings if missing
(en as Record<string, string>).calendar_events =
	(en as Record<string, string>).calendar_events || "events";
(ar as Record<string, string>).calendar_events =
	(ar as Record<string, string>).calendar_events || "أحداث";
