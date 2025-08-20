-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 20, 2025 at 05:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `building_maintenance`
--

-- --------------------------------------------------------

--
-- Table structure for table `buildings`
--

CREATE TABLE `buildings` (
  `building_id` int(11) NOT NULL,
  `full_address` varchar(255) DEFAULT NULL,
  `maintenance_type` varchar(100) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `apartments` int(11) DEFAULT NULL,
  `floors` int(11) DEFAULT NULL,
  `committee` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `assigned_workers` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buildings`
--

INSERT INTO `buildings` (`building_id`, `full_address`, `maintenance_type`, `name`, `apartments`, `floors`, `committee`, `phone`, `assigned_workers`) VALUES
(1, '123 Main Street', 'Full', 'מרכז העיר', 46, 11, 'יוסי ', '0542101515', '2,9,11'),
(2, '123 Herzl St, Haifa', 'Full', 'נוף ים', 20, 6, 'שמעון אבדוליאני', '0545565785', '4,9'),
(5, 'ברל כצלנסון 47 , חיפה', 'Full', 'ברל', 44, 10, 'גדי חדד', '0542510949', '9'),
(6, 'קיבוץ גליות 20 נשר', 'Full', 'אלמוגים', 4, 2, 'גיל חדד', '0542510949', '9,2'),
(7, 'העמוס 18 נשר', 'Full', 'עמוס 18', 48, 18, 'אליעד ממן', '0541349549', '2,11'),
(9, 'שמואל שרירא 3', 'Full', 'שמואל', 24, 8, 'אלון', '0503817422', '2');

-- --------------------------------------------------------

--
-- Table structure for table `building_finance`
--

CREATE TABLE `building_finance` (
  `building_id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `total_paid` decimal(10,2) DEFAULT NULL,
  `balance_due` decimal(10,2) DEFAULT NULL,
  `maintenance` decimal(10,2) DEFAULT NULL,
  `month` varchar(7) NOT NULL DEFAULT '2025-06'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `building_finance`
--

INSERT INTO `building_finance` (`building_id`, `name`, `address`, `total_paid`, `balance_due`, `maintenance`, `month`) VALUES
(1, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-05'),
(1, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-06'),
(2, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-08'),
(5, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-05'),
(5, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-08'),
(6, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-05'),
(6, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-08'),
(7, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-05'),
(7, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-08'),
(9, NULL, NULL, 5000.00, 700.00, 1800.00, '2025-08');

-- --------------------------------------------------------

--
-- Table structure for table `employee_reports`
--

CREATE TABLE `employee_reports` (
  `report_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `month` varchar(20) DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `payslip_url` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_reports`
--

INSERT INTO `employee_reports` (`report_id`, `employee_id`, `month`, `salary`, `paid`, `payslip_url`, `updated_at`, `updated_by`) VALUES
(1, 1, '2025-04', 3200.00, 0, 'payslips/april_2025.pdf', '2025-05-26 10:51:18', 'admin'),
(2, 2, '2025-05', 2000.00, 1, NULL, '2025-08-12 12:51:23', NULL),
(3, 4, '2025-05', 2000.00, 1, NULL, '2025-08-12 12:51:24', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `external_suppliers`
--

CREATE TABLE `external_suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `field` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `buildings` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `external_suppliers`
--

INSERT INTO `external_suppliers` (`id`, `name`, `field`, `phone`, `email`, `buildings`) VALUES
(1, 'גיל חדד', 'משאבות מים', '0542510949', 'gil7hadad@gmail.com', NULL),
(2, 'חמו משאבות', 'משאבות', '0540646612', 'midan@gmail.com', NULL),
(3, 'אלון ג אחזקות בעמ', 'שערים חשמליים', '0503874710', 'meidan@admin.com', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `building_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('שולם','חוב','ממתין') DEFAULT 'ממתין',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `tenant_id`, `building_id`, `payment_date`, `category`, `description`, `amount`, `status`, `created_at`) VALUES
(1, 1, 1, '2025-05-25', 'שכר חודשי', 'תשלומים ', 500.00, 'שולם', '2025-06-04 13:11:40'),
(5, 1, 7, '2025-05-27', 'שכר חודשי', 'תחזוקה', 600.00, 'חוב', '2025-06-04 15:59:04'),
(6, 3, 5, '2025-05-26', 'שכר חודשי', 'תשלומים ', 100.00, 'שולם', '2025-06-04 16:12:00'),
(8, 3, 1, '2025-05-06', 'תשלומים', 'חמו', 555.00, 'ממתין', '2025-08-05 13:56:21'),
(9, 3, 6, '2025-05-10', 'שכר חודשי', 'תשלומים ', 500.00, 'שולם', '2025-08-06 11:55:18'),
(10, 3, 2, '2025-08-13', 'תחזוקת בניין', 'תשלומים ', 450.00, 'שולם', '2025-08-06 13:20:12'),
(11, 10, 5, '2025-08-13', 'תחזוקת בניין', 'תשלום חודשי', 500.00, 'שולם', '2025-08-12 12:31:05'),
(12, 10, 6, '2025-08-12', 'תחזוקת בניין', 'תשלום חודשי', 1000.00, 'שולם', '2025-08-12 14:35:12'),
(13, 12, 5, '2025-08-14', 'תחזוקת בניין', 'תשלום חודשי', 450.00, 'שולם', '2025-08-13 13:14:58'),
(14, 12, 7, '2025-08-18', 'תחזוקת בניין', 'תשלום חודשי', 350.00, 'שולם', '2025-08-13 13:19:02'),
(15, 10, 5, '2025-08-18', 'תחזוקת בניין', '11', 4500.00, 'שולם', '2025-08-18 13:49:19'),
(16, 15, 7, '2025-08-20', 'תחזוקת בניין', '', 1500.00, 'חוב', '2025-08-20 13:10:42');

-- --------------------------------------------------------

--
-- Table structure for table `reminder_logs`
--

CREATE TABLE `reminder_logs` (
  `id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `reminder_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reminder_logs`
--

INSERT INTO `reminder_logs` (`id`, `payment_id`, `tenant_id`, `reminder_date`) VALUES
(3, 5, 1, '2025-06-04 16:18:16'),
(6, 5, 1, '2025-06-19 15:09:55'),
(7, 8, 3, '2025-08-05 13:56:29'),
(8, 5, 1, '2025-08-06 12:30:57'),
(9, 10, 3, '2025-08-08 12:55:32'),
(10, 10, 3, '2025-08-09 14:21:15'),
(12, 10, 3, '2025-08-11 14:39:10'),
(13, 10, 3, '2025-08-12 16:22:04');

-- --------------------------------------------------------

--
-- Table structure for table `routinetaskexecutions`
--

CREATE TABLE `routinetaskexecutions` (
  `execution_id` int(11) NOT NULL,
  `task_id` int(11) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `routinetasks`
--

CREATE TABLE `routinetasks` (
  `task_id` int(11) NOT NULL,
  `building_id` int(11) DEFAULT NULL,
  `task_name` varchar(100) DEFAULT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `next_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `type` varchar(100) DEFAULT NULL,
  `task_time` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `routinetasks`
--

INSERT INTO `routinetasks` (`task_id`, `building_id`, `task_name`, `frequency`, `next_date`, `created_at`, `type`, `task_time`) VALUES
(2, 1, 'ניקיון לובי קומת קרקע', 'שבועי', '2025-08-22', '2025-05-12 06:00:01', 'ניקיון', '12:30:00'),
(3, 2, 'שטיפת חדר מדרגות', 'שבועי', '2025-08-21', '2025-05-12 07:42:39', 'ניקיון', '11:15:00'),
(11, 5, 'ניקיון תקרה', 'חודשי', '2025-04-27', '2025-05-14 16:21:59', 'חשמל', '10:30:00'),
(18, 6, 'ניקיון חנייה', 'שבועי', '2025-05-12', '2025-05-18 13:22:19', 'ניקיון', '09:00:00'),
(19, 5, 'חשמלאי', 'שבועי', '2025-08-07', '2025-08-06 12:14:45', 'תיקון', '12:00:00'),
(20, 7, 'מלא גוקים בקומה 14', 'חודשי', '2025-08-20', '2025-08-06 13:16:19', 'הדברה', '17:00:00'),
(21, 9, 'ניקיון קומות', 'שבועי', '2025-08-08', '2025-08-08 10:01:39', 'ניקיון', '09:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `servicecalls`
--

CREATE TABLE `servicecalls` (
  `call_id` int(11) NOT NULL,
  `building_id` int(11) DEFAULT NULL,
  `read_index` varchar(50) DEFAULT NULL,
  `service_type` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` varchar(200) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `location_in_building` varchar(255) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `closed_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `servicecalls`
--

INSERT INTO `servicecalls` (`call_id`, `building_id`, `read_index`, `service_type`, `status`, `description`, `created_at`, `created_by`, `image_url`, `location_in_building`, `cost`, `closed_by`) VALUES
(24, 1, '0', 'חשמל', 'Closed', 'כי ככה', '2025-05-11 12:24:52', 'Meidan Chemo', 'http://localhost:8801/uploads/1747228107049.png', 'שדגשדג', NULL, 'מידן חמו'),
(25, 1, '0', 'תקלה אישית', 'Closed', 'הדלת לא נסגרת ', '2025-05-12 08:32:21', 'Meidan Chemo', 'http://localhost:8801/uploads/1747038741912.png', 'קומה 5 דירה 20', NULL, NULL),
(26, 6, '0', 'אינסטלציה', 'Closed', 'קקי בתחתון של מידן חמו ', '2025-05-28 11:48:42', 'מידן חמו', 'http://localhost:8801/uploads/1748432954002.png', 'קומה 4 ליד דלת 15', 80.00, 'מידן חמו'),
(27, 7, '0', 'אחר', 'Closed', 'לידי', '2025-06-03 10:07:36', 'מידן חמו', 'http://localhost:8801/uploads/1749382502120.png', 'לידור בחדר אשפה', NULL, 'מידן חמו'),
(28, 7, '0', 'נזילה', 'Closed', 'נזילה בביוב', '2025-06-08 12:00:09', 'מידן חמו', 'http://localhost:8801/uploads/1749384009073.png', 'קומה 23 ליד דלת 69', 19.00, 'מידן חמו'),
(35, 5, '0', 'חשמל', 'Closed', 'ת', '2025-08-18 09:16:48', 'מידן חמו', NULL, '15', 153.00, 'מידן חמו'),
(36, 7, '0', 'נזילה', 'Closed', 'דשגדש', '2025-08-18 09:18:25', 'מידן חמו', NULL, 'קומה 3 דירה 15', 153.00, 'מידן חמו'),
(37, 5, '0', 'חשמל', 'Closed', 'ת', '2025-08-18 09:36:32', 'מידן חמו', NULL, '16', 789.00, 'מידן חמו'),
(38, 2, '0', 'חשמל', 'Closed', '2', '2025-08-18 09:58:36', 'מידן חמו', NULL, '12', 153.00, 'מידן חמו'),
(39, 6, '0', 'חשמל', 'Closed', '213', '2025-08-18 10:05:55', 'מידן חמו', NULL, '123', 333.00, 'מידן חמו'),
(40, 9, '0', 'חשמל', 'Closed', '2', '2025-08-18 10:32:38', 'מידן חמו', NULL, '123', 220.00, 'מידן חמו'),
(41, 6, '0', 'חשמל', 'Closed', '1', '2025-08-20 09:42:41', 'מידן חמו', NULL, '2', 333.00, 'מידן חמו'),
(42, 6, '0', 'חשמל', 'Closed', 'תקלה בקומות 12 13 לא עובד מנורות', '2025-08-20 09:50:43', 'מידן חמו', NULL, '2', 555.00, 'מידן חמו'),
(43, 7, '0', 'חשמל', 'Closed', 'תקלה במנורה', '2025-08-20 10:08:17', 'מידן חמו', NULL, '2', 1200.00, 'מידן חמו');

-- --------------------------------------------------------

--
-- Table structure for table `servicecallupdates`
--

CREATE TABLE `servicecallupdates` (
  `update_id` int(11) NOT NULL,
  `call_id` int(11) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `update_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `comment` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `id_number` varchar(20) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `building_id` int(11) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `apartment_number` varchar(20) DEFAULT NULL,
  `tax_file` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `id_number`, `name`, `email`, `role`, `building_id`, `position`, `apartment_number`, `tax_file`, `password`, `phone`) VALUES
(1, '206455146', 'מידן חמו', 'meidan@gmail.com', 'manager', NULL, 'מנהל ראשי', NULL, NULL, 'admin123', '0454564805'),
(2, '987654321', 'איתי כהן', 'itai@worker.com', 'worker', NULL, 'super', NULL, 'tax123.pdf', 'worker123', '0500000008'),
(3, '456709123', 'נועה לוי', 'noa@tenant.com', 'tenant', 5, NULL, '12', NULL, 'tenant123', '0500000003'),
(4, '206415574', 'לידור סויסה', 'lidi@worker.com', 'worker', NULL, 'cleaner', NULL, NULL, '1234', '0543365055'),
(7, '207433368', 'גיל חדד', 'gil7hadad@gmail.com', 'manager', NULL, NULL, NULL, NULL, '1234', '0542510949'),
(9, '204181511', 'בר סטיאוי', 'stiavi@gmail.com', 'worker', NULL, NULL, NULL, NULL, '1234', '0525051505'),
(10, '206455149', 'מידן חמו', 'meidanchemo10@gmail.com', 'tenant', 6, NULL, NULL, NULL, '123456', '0503874710'),
(11, '207455194', 'תום חמו', 'meidan@admin.com', 'worker', NULL, NULL, NULL, NULL, '123456', '0506667576'),
(12, '204455149', 'דולב חזיזה', 'haziza@gmail.com', 'tenant', 7, NULL, NULL, NULL, '123456', '0503745124'),
(13, '204556661', 'אביב קציר', 'aviv@gmail.com', 'tenant', 9, NULL, NULL, NULL, '1234789', '0546325541'),
(14, '204555566', 'אביב', 'lidi@worker.com', 'tenant', 9, NULL, NULL, NULL, '123', '0546666666'),
(15, '204565149', 'ארז', 'erez@gmail.com', 'tenant', 7, NULL, NULL, NULL, '123456', '0547896321');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `buildings`
--
ALTER TABLE `buildings`
  ADD PRIMARY KEY (`building_id`);

--
-- Indexes for table `building_finance`
--
ALTER TABLE `building_finance`
  ADD PRIMARY KEY (`building_id`,`month`),
  ADD UNIQUE KEY `uq_building_month` (`building_id`,`month`);

--
-- Indexes for table `employee_reports`
--
ALTER TABLE `employee_reports`
  ADD PRIMARY KEY (`report_id`);

--
-- Indexes for table `external_suppliers`
--
ALTER TABLE `external_suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `building_id` (`building_id`);

--
-- Indexes for table `reminder_logs`
--
ALTER TABLE `reminder_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payment_id` (`payment_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `routinetaskexecutions`
--
ALTER TABLE `routinetaskexecutions`
  ADD PRIMARY KEY (`execution_id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `routinetasks`
--
ALTER TABLE `routinetasks`
  ADD PRIMARY KEY (`task_id`),
  ADD KEY `building_id` (`building_id`);

--
-- Indexes for table `servicecalls`
--
ALTER TABLE `servicecalls`
  ADD PRIMARY KEY (`call_id`),
  ADD KEY `building_id` (`building_id`);

--
-- Indexes for table `servicecallupdates`
--
ALTER TABLE `servicecallupdates`
  ADD PRIMARY KEY (`update_id`),
  ADD KEY `call_id` (`call_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `id_number` (`id_number`),
  ADD KEY `idx_users_building_id` (`building_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buildings`
--
ALTER TABLE `buildings`
  MODIFY `building_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `employee_reports`
--
ALTER TABLE `employee_reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `external_suppliers`
--
ALTER TABLE `external_suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `reminder_logs`
--
ALTER TABLE `reminder_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `routinetaskexecutions`
--
ALTER TABLE `routinetaskexecutions`
  MODIFY `execution_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `routinetasks`
--
ALTER TABLE `routinetasks`
  MODIFY `task_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `servicecalls`
--
ALTER TABLE `servicecalls`
  MODIFY `call_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `servicecallupdates`
--
ALTER TABLE `servicecallupdates`
  MODIFY `update_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reminder_logs`
--
ALTER TABLE `reminder_logs`
  ADD CONSTRAINT `reminder_logs_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reminder_logs_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `routinetaskexecutions`
--
ALTER TABLE `routinetaskexecutions`
  ADD CONSTRAINT `routinetaskexecutions_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `routinetasks` (`task_id`),
  ADD CONSTRAINT `routinetaskexecutions_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `routinetasks`
--
ALTER TABLE `routinetasks`
  ADD CONSTRAINT `routinetasks_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`building_id`);

--
-- Constraints for table `servicecalls`
--
ALTER TABLE `servicecalls`
  ADD CONSTRAINT `servicecalls_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`building_id`);

--
-- Constraints for table `servicecallupdates`
--
ALTER TABLE `servicecallupdates`
  ADD CONSTRAINT `servicecallupdates_ibfk_1` FOREIGN KEY (`call_id`) REFERENCES `servicecalls` (`call_id`),
  ADD CONSTRAINT `servicecallupdates_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
