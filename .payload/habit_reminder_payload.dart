import 'dart:convert';

class HabitReminderPayload {
  final String habitId;
  final String habitName;
  final String notificationBody;
  final List<String> days;
  final bool timer;
  final bool repeat;
  final String? time;
  final String? startTime;
  final String? endTime;
  final int? repeatCount;

  HabitReminderPayload({
    required this.habitId,
    required this.habitName,
    required this.notificationBody,
    required this.days,
    required this.timer,
    required this.repeat,
    this.time,
    this.startTime,
    this.endTime,
    this.repeatCount,
  }) : assert(
          timer != repeat,
          'timer aur repeat mein se sirf ek hi true ho sakta hai',
        );

  factory HabitReminderPayload.timerMode({
    required String habitId,
    required String habitName,
    required String notificationBody,
    required List<String> days,
    required String time,
  }) {
    return HabitReminderPayload(
      habitId: habitId,
      habitName: habitName,
      notificationBody: notificationBody,
      days: days,
      timer: true,
      repeat: false,
      time: time,
    );
  }

  factory HabitReminderPayload.repeatMode({
    required String habitId,
    required String habitName,
    required String notificationBody,
    required List<String> days,
    required String startTime,
    required String endTime,
    required int repeatCount,
  }) {
    return HabitReminderPayload(
      habitId: habitId,
      habitName: habitName,
      notificationBody: notificationBody,
      days: days,
      timer: false,
      repeat: true,
      startTime: startTime,
      endTime: endTime,
      repeatCount: repeatCount,
    );
  }

  Map<String, dynamic> toJson() => {
        'habitId': habitId,
        'habitName': habitName,
        'notificationBody': notificationBody,
        'days': days,
        'timer': timer,
        'repeat': repeat,
        if (timer) 'time': time,
        if (repeat) 'startTime': startTime,
        if (repeat) 'endTime': endTime,
        if (repeat) 'repeatCount': repeatCount,
      };

  factory HabitReminderPayload.fromJson(Map<String, dynamic> json) {
    return HabitReminderPayload(
      habitId: json['habitId'] as String,
      habitName: json['habitName'] as String,
      notificationBody: json['notificationBody'] as String,
      days: List<String>.from(json['days'] as List),
      timer: json['timer'] as bool,
      repeat: json['repeat'] as bool,
      time: json['time'] as String?,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      repeatCount: json['repeatCount'] as int?,
    );
  }

  HabitReminderPayload copyWith({
    String? habitId,
    String? habitName,
    String? notificationBody,
    List<String>? days,
    bool? timer,
    bool? repeat,
    String? time,
    String? startTime,
    String? endTime,
    int? repeatCount,
  }) {
    return HabitReminderPayload(
      habitId: habitId ?? this.habitId,
      habitName: habitName ?? this.habitName,
      notificationBody: notificationBody ?? this.notificationBody,
      days: days ?? this.days,
      timer: timer ?? this.timer,
      repeat: repeat ?? this.repeat,
      time: time ?? this.time,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      repeatCount: repeatCount ?? this.repeatCount,
    );
  }

  @override
  String toString() => jsonEncode(toJson());
}
