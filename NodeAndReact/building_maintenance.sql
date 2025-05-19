-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 19, 2025 at 08:09 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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
  `phone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buildings`
--

INSERT INTO `buildings` (`building_id`, `full_address`, `maintenance_type`, `name`, `apartments`, `floors`, `committee`, `phone`) VALUES
(1, '123 Main Street', 'Full', 'חמו', 44, 11, 'יוסי חמו', '0542101515'),
(2, '123 Herzl St, Haifa', 'Full', 'נוף ים', 20, 6, 'שמעון אבדוליאני', '0545565785'),
(5, 'ברל כצלנסון 47 , חיפה', 'Full', 'ברל כצלנסון', 44, 10, 'גדי חדד', '0542510949'),
(6, 'קיבוץ גליות 20 נשר', 'Full', 'אלמוגים', 4, 2, 'גיל חדד', '0542510949');

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
  `maintenance` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(2, 'חמו משאבות', 'משאבות', '0540646612', 'midan@gmail.com', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `monthly_reports`
--

CREATE TABLE `monthly_reports` (
  `month` varchar(20) NOT NULL,
  `income` decimal(10,2) DEFAULT NULL,
  `debt` decimal(10,2) DEFAULT NULL,
  `expense` decimal(10,2) DEFAULT NULL,
  `profit` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `description` text DEFAULT NULL,
  `paypal_transaction_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(2, 1, 'ניקיון לובי קומת קרקע', 'שבועי', '2025-05-16', '2025-05-12 06:00:01', 'ניקיון', '10:30:00'),
(3, 2, 'שטיפת חדר מדרגות', 'שבועי', '2025-05-17', '2025-05-12 07:42:39', 'ניקיון', '11:15:00'),
(11, 5, 'ניקיון תקרה', 'חודשי', '2025-04-29', '2025-05-14 16:21:59', 'חשמל', '10:30:00'),
(18, 6, 'ניקיון חנייה', 'יומי', '2025-05-16', '2025-05-18 13:22:19', 'ניקיון', '09:00:00');

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
  `location_in_building` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `servicecalls`
--

INSERT INTO `servicecalls` (`call_id`, `building_id`, `read_index`, `service_type`, `status`, `description`, `created_at`, `created_by`, `image_url`, `location_in_building`) VALUES
(21, 2, '0', 'חשמל', 'Closed', 'שקע המתג יוצא לבחוץ \r\n', '2025-05-08 07:39:25', 'Meidan Chemo', 'http://localhost:8801/uploads/1746689965346.png', 'קומה 2 דירה 77'),
(22, 1, '0', 'נזילה', 'Closed', 'בעיה', '2025-05-08 08:18:31', 'Meidan Chemo', 'http://localhost:8801/uploads/1746692335780.png', 'בן זונה'),
(23, 1, '0', 'אינסטלציה', 'Closed', 'חור בצנרת הקידמית', '2025-05-08 08:18:49', 'Meidan Chemo', 'http://localhost:8801/uploads/1746964852743.png', 'קומה 3 ליד דירה 15'),
(24, 1, '0', 'חשמל', 'Closed', 'כי ככה', '2025-05-11 12:24:52', 'Meidan Chemo', 'http://localhost:8801/uploads/1747228107049.png', 'שדגשדג'),
(25, 1, '0', 'תקלה אישית', 'Closed', 'הדלת לא נסגרת ', '2025-05-12 08:32:21', 'Meidan Chemo', 'http://localhost:8801/uploads/1747038741912.png', 'קומה 5 דירה 20');

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
  `position` varchar(100) DEFAULT NULL,
  `apartment_number` varchar(20) DEFAULT NULL,
  `tax_file` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `id_number`, `name`, `email`, `role`, `position`, `apartment_number`, `tax_file`, `password`, `phone`) VALUES
(1, '123456789', 'מידן חמו', 'meidan@admin.com', 'manager', 'מנהל ראשי', NULL, NULL, 'admin123', '0454564867'),
(2, '987654321', 'איתי כהן', 'itai@worker.com', 'worker', 'חשמלאי', NULL, 'tax123.pdf', 'worker123', '050-0000002'),
(3, '456789123', 'נועה לוי', 'noa@tenant.com', 'tenant', NULL, '12', NULL, 'tenant123', '050-0000003');

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
  ADD PRIMARY KEY (`building_id`);

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
-- Indexes for table `monthly_reports`
--
ALTER TABLE `monthly_reports`
  ADD PRIMARY KEY (`month`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
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
  ADD UNIQUE KEY `id_number` (`id_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buildings`
--
ALTER TABLE `buildings`
  MODIFY `building_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `employee_reports`
--
ALTER TABLE `employee_reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `external_suppliers`
--
ALTER TABLE `external_suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `routinetaskexecutions`
--
ALTER TABLE `routinetaskexecutions`
  MODIFY `execution_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `routinetasks`
--
ALTER TABLE `routinetasks`
  MODIFY `task_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `servicecalls`
--
ALTER TABLE `servicecalls`
  MODIFY `call_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `servicecallupdates`
--
ALTER TABLE `servicecallupdates`
  MODIFY `update_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`user_id`);

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
