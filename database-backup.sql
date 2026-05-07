-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 07, 2026 at 10:16 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `doms`
--

-- --------------------------------------------------------

--
-- Table structure for table `academic_sessions`
--

CREATE TABLE `academic_sessions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `description` text DEFAULT NULL,
  `registration_token` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `academic_sessions`
--

INSERT INTO `academic_sessions` (`id`, `name`, `start_date`, `end_date`, `is_active`, `description`, `registration_token`, `created_at`, `updated_at`) VALUES
('14ef0337-9de9-4f2d-9938-e65401a9afb3', 'Demo Academic Session', '2026-05-04 00:00:00', '2026-05-20 00:00:00', 1, 'demo', 'b92a1b0e23d42ea62cc610cc5655bff3db53bba4d158d76699eea8b5dacc84b9', '2026-05-03 07:23:40', '2026-05-03 17:36:57'),
('df105448-182c-4e08-985d-e73b0a0a07a3', 'Academic Session 2025-27', '2025-06-02 00:00:00', '2027-05-31 00:00:00', 1, '', '70dcc0f5f7c1fae814ebbb1067eb78b0492b5638e63b553997ac9d1b718a0512', '2026-05-02 12:00:21', '2026-05-04 04:31:53');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `type` enum('PUBLIC','PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(255) DEFAULT NULL,
  `image_orientation` enum('SQUARE','LANDSCAPE','PORTRAIT') DEFAULT NULL,
  `status` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `content`, `type`, `created_by`, `file_url`, `file_name`, `file_type`, `image_orientation`, `status`, `created_at`, `updated_at`) VALUES
('047fd041-b463-4096-831e-4c792913d52c', 'Drive', 'fhgjkn', 'PRIVATE', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/announcements/2a962248-04fc-4032-a70b-77c410efbdd9-1778068158564.JPG', '567bf2d5-04a7-45c1-813d-0454110ed101.JPG', 'image/jpeg', 'SQUARE', 'ACTIVE', '2026-05-06 11:49:19', '2026-05-06 11:49:19'),
('314c9991-7e36-4fe8-97f5-30b718871408', 'Demo', 'Demo', 'PRIVATE', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/announcements/cf5ddc01-1a75-4cb6-82cf-1f155cdecccd-1778059359637.jpeg', 'WhatsApp Image 2026-05-04 at 11.51.07.jpeg', 'image/jpeg', 'SQUARE', 'ACTIVE', '2026-05-06 08:52:38', '2026-05-06 09:22:40'),
('9d021c3c-c568-4c63-867c-7deb752edeef', 'Placement', 'hello', 'PUBLIC', '40f4dc9f-a6e7-441b-8303-7064092f577a', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/announcements/df5456ff-5c5e-4228-8a64-f62eb0ac9556-1778061523502.JPG', 'da70d73d-bbed-4226-8953-84e4c9629b14.JPG', 'image/jpeg', 'SQUARE', 'ACTIVE', '2026-05-06 09:58:44', '2026-05-06 09:58:44');

-- --------------------------------------------------------

--
-- Table structure for table `assessments`
--

CREATE TABLE `assessments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('AUTO_GRADE','MANUAL') DEFAULT 'MANUAL',
  `status` enum('DRAFT','PUBLISHED','CLOSED') DEFAULT 'DRAFT',
  `assignment_scope` enum('ALL_STUDENTS','CATEGORY','SPECIFIC_STUDENT') NOT NULL,
  `academic_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `deadline` datetime DEFAULT NULL,
  `total_points` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessments`
--

INSERT INTO `assessments` (`id`, `title`, `description`, `type`, `status`, `assignment_scope`, `academic_session_id`, `created_by`, `deadline`, `total_points`, `created_at`, `updated_at`) VALUES
('1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'Continual Final', '', 'MANUAL', 'PUBLISHED', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', NULL, 0, '2026-05-06 12:37:55', '2026-05-06 12:38:57'),
('30204709-72b0-45b2-86f6-f7a8bfb2c860', 'Assignment by Faculty 1', '', 'MANUAL', 'PUBLISHED', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8daf0158-3616-42b9-be00-06a31b9dad0b', NULL, 0, '2026-05-03 07:14:13', '2026-05-03 07:15:12'),
('4b690fa0-ea63-40b5-be62-8bd005b6c444', 'test', '', 'MANUAL', 'DRAFT', 'CATEGORY', '14ef0337-9de9-4f2d-9938-e65401a9afb3', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', NULL, 0, '2026-05-03 09:00:06', '2026-05-03 09:00:06'),
('4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'Demonstration', '', 'MANUAL', 'DRAFT', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', NULL, 0, '2026-05-06 11:22:14', '2026-05-06 11:30:27'),
('51902ea4-817a-405d-b8c9-dd2a20264eb3', 'Demo Assessment', '', 'MANUAL', 'PUBLISHED', 'SPECIFIC_STUDENT', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', NULL, 0, '2026-05-02 12:18:29', '2026-05-02 12:19:06'),
('836693fe-56e9-4452-9fa0-3a55d139bbd3', 'demo 2', '', 'MANUAL', 'PUBLISHED', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', NULL, 0, '2026-05-03 06:05:05', '2026-05-03 06:38:20'),
('9c97bb62-e342-45d1-bf21-a625f442a8f1', 'Mid Term May 2026', '', 'MANUAL', 'PUBLISHED', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', NULL, 0, '2026-05-03 17:43:20', '2026-05-03 17:47:22'),
('ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'Continual', '', 'MANUAL', 'PUBLISHED', 'ALL_STUDENTS', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', NULL, 0, '2026-05-04 04:45:56', '2026-05-04 04:48:59');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_assignments`
--

CREATE TABLE `assessment_assignments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assessment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `student_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_assignments`
--

INSERT INTO `assessment_assignments` (`id`, `assessment_id`, `student_session_id`, `category_id`, `assigned_at`, `created_at`, `updated_at`) VALUES
('13f7a878-2a21-4294-8d66-bb5e21ff1e2f', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '21c71b94-7aa4-4410-83e4-f869cf8cec72', NULL, '2026-05-03 05:49:59', '2026-05-03 05:49:59', '2026-05-03 05:49:59'),
('1756a640-9924-4ff0-8b66-893a199b70f8', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', '60c252ea-5170-415b-8b13-b4ced98ed01a', NULL, '2026-05-06 12:38:50', '2026-05-06 12:38:50', '2026-05-06 12:38:50'),
('5a83f7e7-5a97-49e3-ac51-b4c53b3612f8', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', NULL, '2026-05-03 06:29:46', '2026-05-03 06:29:46', '2026-05-03 06:29:46'),
('5f3f2643-8704-486e-9308-21e6b3c1cb9f', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'b0e182af-1219-452d-aef7-5f89c632f6fe', NULL, '2026-05-04 04:47:28', '2026-05-04 04:47:28', '2026-05-04 04:47:28'),
('62c273b2-fe5f-43a8-bcf6-11b8e870aff2', '51902ea4-817a-405d-b8c9-dd2a20264eb3', NULL, '81ff337c-c833-4aaa-95d5-575263414da7', '2026-05-02 12:18:49', '2026-05-02 12:18:49', '2026-05-02 12:18:49'),
('678b211f-792b-45e8-8299-62a67cb9c015', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'b0e182af-1219-452d-aef7-5f89c632f6fe', NULL, '2026-05-06 12:38:50', '2026-05-06 12:38:50', '2026-05-06 12:38:50'),
('6bc07c3b-017f-4024-b282-7aef80880014', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '60c252ea-5170-415b-8b13-b4ced98ed01a', NULL, '2026-05-03 06:19:16', '2026-05-03 06:19:16', '2026-05-03 06:19:16'),
('6d0eef99-abf8-4b99-945b-15b1ee4bef92', '836693fe-56e9-4452-9fa0-3a55d139bbd3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', NULL, '2026-05-03 06:38:07', '2026-05-03 06:38:07', '2026-05-03 06:38:07'),
('80fa6a89-c195-4818-87c9-051ab14c4a3e', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', NULL, '2026-05-06 12:38:50', '2026-05-06 12:38:50', '2026-05-06 12:38:50'),
('c75b27f9-7c10-4a0d-af67-d704a9e24bf2', '30204709-72b0-45b2-86f6-f7a8bfb2c860', '397ff0b0-c280-4c9d-9d84-852eb8b3b050', NULL, '2026-05-03 07:15:04', '2026-05-03 07:15:04', '2026-05-03 07:15:04'),
('f043206c-d813-4973-947f-a510aff08461', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', '35ae8d77-e9e6-4cdb-9a8a-35974bbee16a', NULL, '2026-05-06 12:38:50', '2026-05-06 12:38:50', '2026-05-06 12:38:50'),
('f4a72598-be5e-4d3b-b159-a60c45becb6b', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'b0e182af-1219-452d-aef7-5f89c632f6fe', NULL, '2026-05-03 17:44:26', '2026-05-03 17:44:26', '2026-05-03 17:44:26'),
('f5585895-0160-4025-acfa-3f7edce959d9', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'b0e182af-1219-452d-aef7-5f89c632f6fe', NULL, '2026-05-06 11:23:55', '2026-05-06 11:23:55', '2026-05-06 11:23:55');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_questions`
--

CREATE TABLE `assessment_questions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assessment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('TEXT','MCQ','FILE') NOT NULL,
  `points_value` int(11) DEFAULT 1,
  `order_index` int(11) DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_questions`
--

INSERT INTO `assessment_questions` (`id`, `assessment_id`, `question_text`, `question_type`, `points_value`, `order_index`, `metadata`, `created_at`, `updated_at`) VALUES
('06445fe6-6f39-41d0-9653-d47d6e15e6b6', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'Resume', 'FILE', 1, 2, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-04 04:46:47', '2026-05-04 04:46:47'),
('12db238b-5aa6-4b74-9dd4-67fe6f10f2c1', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'Upload your Finance Assignment', 'FILE', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-03 17:44:53', '2026-05-03 17:44:53'),
('14658db6-95b2-48b4-a565-5472cd0d5277', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'Name', 'TEXT', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-06 11:22:47', '2026-05-06 11:22:47'),
('19e406ea-a456-415e-a183-8eeb5eeb9268', '30204709-72b0-45b2-86f6-f7a8bfb2c860', 'Demo', 'FILE', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-03 07:14:34', '2026-05-03 07:14:34'),
('6a82adb6-bbf8-4d4c-89da-c77eb5e487bf', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'File', 'TEXT', 1, 2, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-06 11:22:51', '2026-05-06 11:22:51'),
('9706bdeb-f98e-4ac6-9ed1-cd1c5365574d', '51902ea4-817a-405d-b8c9-dd2a20264eb3', 'Demo Question', 'TEXT', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-02 12:18:42', '2026-05-02 12:18:42'),
('9fd7bc07-0376-470d-8b2e-b7a85b381d3a', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'Enter the topic you have chosen.', 'TEXT', 1, 2, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-03 17:45:10', '2026-05-03 17:45:10'),
('a2eb0bdc-32f2-4e2e-a383-eb43732d7d12', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'Name', 'TEXT', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-06 12:38:16', '2026-05-06 12:38:16'),
('de0cd9fb-f328-4fed-b3de-2db942e0f256', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'Name', 'TEXT', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-04 04:46:40', '2026-05-04 04:46:40'),
('f96206fa-ae0c-417a-bafa-f7f17a29abca', '836693fe-56e9-4452-9fa0-3a55d139bbd3', 'Name', 'TEXT', 1, 1, '{\"options\":[],\"correctAnswers\":[],\"multipleCorrect\":false}', '2026-05-03 06:05:42', '2026-05-03 06:05:42');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_responses`
--

CREATE TABLE `assessment_responses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `submission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `response` text DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_responses`
--

INSERT INTO `assessment_responses` (`id`, `submission_id`, `question_id`, `response`, `score`, `is_correct`, `feedback`, `file_url`, `created_at`, `updated_at`) VALUES
('211b0653-b8ee-4346-9bd5-15094feb8123', 'f4268a4d-5746-400d-9788-dd9374dce420', '6a82adb6-bbf8-4d4c-89da-c77eb5e487bf', '\"qwqwwqw\"', NULL, NULL, NULL, NULL, '2026-05-06 11:26:05', '2026-05-06 11:26:06'),
('47348c69-037c-4493-a22b-7ea4ab02afd6', '477cbd31-5f83-4bdb-8c71-827f232da6ab', '9706bdeb-f98e-4ac6-9ed1-cd1c5365574d', '\"test\"', NULL, NULL, NULL, NULL, '2026-05-03 06:34:19', '2026-05-03 06:34:20'),
('606213c6-5915-4480-9ce2-edcb7eaaaaba', 'a716da04-d737-4353-b77c-9f9ec0bc13db', '9706bdeb-f98e-4ac6-9ed1-cd1c5365574d', '\"Answer\"', NULL, NULL, NULL, NULL, '2026-05-02 12:19:46', '2026-05-02 12:19:46'),
('99cca61c-e920-45da-a2ed-247331b710d2', 'e6a34314-3611-4f1c-a442-78163c6a94cd', 'de0cd9fb-f328-4fed-b3de-2db942e0f256', '\"ABC\"', NULL, NULL, NULL, NULL, '2026-05-04 04:49:36', '2026-05-04 04:49:37'),
('b83f2633-131f-46b1-b22f-9ba006bbd04a', 'b0a5078c-20c0-46ec-97e2-f3fb50b6e229', 'f96206fa-ae0c-417a-bafa-f7f17a29abca', '\"demo\"', NULL, NULL, NULL, NULL, '2026-05-03 06:38:30', '2026-05-03 06:38:30'),
('bd5543df-022b-4266-92a7-8c751963ff7d', 'a0bec99b-811a-4078-9cfe-4e51860a3362', '12db238b-5aa6-4b74-9dd4-67fe6f10f2c1', '\"Prasasti Pundir_Profile.pdf\"', NULL, NULL, NULL, 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/profiles/9a82c31c-25ca-4418-adc0-0892193412d3-1777830500690.pdf', '2026-05-03 17:48:20', '2026-05-03 17:48:20'),
('bd68fb06-0bec-4253-b4e4-d150ead6a71a', 'f4268a4d-5746-400d-9788-dd9374dce420', '14658db6-95b2-48b4-a565-5472cd0d5277', '\"Answerr\"', NULL, NULL, NULL, NULL, '2026-05-06 11:25:58', '2026-05-06 11:26:01'),
('c071612d-6a26-4428-af9f-9bf9d26f99cd', 'e6a34314-3611-4f1c-a442-78163c6a94cd', '06445fe6-6f39-41d0-9653-d47d6e15e6b6', '\"Prasasti Pundir_Profile-3.pdf\"', NULL, NULL, NULL, 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/profiles/56d700ec-17b0-4226-b1f7-a18a8bcbc09c-1777870173855.pdf', '2026-05-04 04:49:34', '2026-05-04 04:49:34'),
('ed280f03-c5f9-4719-a1d4-ccb4d97db2c2', 'a0bec99b-811a-4078-9cfe-4e51860a3362', '9fd7bc07-0376-470d-8b2e-b7a85b381d3a', '\"AI\"', NULL, NULL, NULL, NULL, '2026-05-03 17:48:25', '2026-05-03 17:48:26'),
('fe1aab03-9d1d-4b49-a371-6a6ccf803084', '07f180a5-6c10-4fa3-a456-e43a55ceda13', 'a2eb0bdc-32f2-4e2e-a383-eb43732d7d12', '\"PP\"', NULL, NULL, NULL, NULL, '2026-05-06 12:39:06', '2026-05-06 12:39:07');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_submissions`
--

CREATE TABLE `assessment_submissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assessment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `student_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('IN_PROGRESS','SUBMITTED','GRADED') NOT NULL DEFAULT 'IN_PROGRESS',
  `total_score` decimal(5,2) DEFAULT NULL,
  `graded_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `rubric_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_submissions`
--

INSERT INTO `assessment_submissions` (`id`, `assessment_id`, `student_session_id`, `status`, `total_score`, `graded_by`, `graded_at`, `submitted_at`, `rubric_id`, `created_at`, `updated_at`) VALUES
('00eceac4-f197-4cfc-823d-3a4052496d21', '9c97bb62-e342-45d1-bf21-a625f442a8f1', '9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'GRADED', 58.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:51:33', NULL, '983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', '2026-05-03 17:51:18', '2026-05-03 17:51:33'),
('04457082-e0f8-4ad6-8d29-f35aa5d89052', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '3908c915-1882-48be-9323-efb95c916669', 'GRADED', 45.50, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:13:43', NULL, '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-03 06:08:09', '2026-05-03 06:13:43'),
('07f180a5-6c10-4fa3-a456-e43a55ceda13', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 58.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 12:41:05', '2026-05-06 12:39:11', '872f81a9-9768-4fbb-aade-6ce2191c38dd', '2026-05-06 12:39:04', '2026-05-06 12:41:05'),
('0c4f5a50-16f8-4b55-abf8-5c1de13ce15d', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:34:17', '2026-05-03 06:34:17'),
('0e458905-16c0-4e67-9a5b-f7b60b90fb3c', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-06 12:39:04', '2026-05-06 12:39:04'),
('11804af4-dcc0-4839-8d85-a6b3dc32eee3', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', '3908c915-1882-48be-9323-efb95c916669', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-06 12:41:29', '2026-05-06 12:41:29'),
('217c9c29-970b-4e1d-bd11-553c9168770b', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', '3908c915-1882-48be-9323-efb95c916669', 'GRADED', 76.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:53:36', NULL, '6515316c-dc5c-464e-81c7-d5eb20a472be', '2026-05-04 04:53:08', '2026-05-04 04:53:36'),
('2c2dde82-f059-4c9e-a779-1aa22c65f48d', '836693fe-56e9-4452-9fa0-3a55d139bbd3', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 27.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 07:57:58', NULL, '476b146a-f29a-4666-8dec-6f3043ebe1b3', '2026-05-03 07:57:43', '2026-05-03 07:57:58'),
('31649409-b445-4fc8-aa8e-ab3a9b5000ec', '836693fe-56e9-4452-9fa0-3a55d139bbd3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:38:28', '2026-05-03 06:38:28'),
('3c076677-d97e-4e0c-ade1-868983a45886', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', '9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'GRADED', 54.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 12:41:57', NULL, '872f81a9-9768-4fbb-aade-6ce2191c38dd', '2026-05-06 12:41:31', '2026-05-06 12:41:57'),
('4446434f-e052-4baa-97d1-021e3c94faa4', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '60c252ea-5170-415b-8b13-b4ced98ed01a', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:19:43', '2026-05-03 06:19:43'),
('465893c6-c3c2-4c2d-ade3-4c9083e7e825', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-06 11:25:56', '2026-05-06 11:25:56'),
('477cbd31-5f83-4bdb-8c71-827f232da6ab', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'GRADED', 50.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:34:44', '2026-05-03 06:34:22', '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-03 06:34:17', '2026-05-03 06:34:44'),
('4953fb33-21dd-4abe-8a6f-7fd5bf065b3d', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', 'GRADED', 70.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:28:05', NULL, '8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', '2026-05-06 11:27:17', '2026-05-06 11:28:05'),
('6473bae7-7e78-4fc2-8c5b-ab0c38241014', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-06 11:25:56', '2026-05-06 11:25:56'),
('6694d766-d74b-4b4c-8c6b-2f0ca53a4b15', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-04 04:53:12', '2026-05-04 04:53:12'),
('6d69da16-b3f8-4610-abb4-ec219505ddcf', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '21c71b94-7aa4-4410-83e4-f869cf8cec72', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:18:50', '2026-05-03 06:18:50'),
('70e0cc92-34fb-48ff-9a8f-f819c37e6aa6', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'e88e31fb-f6d2-4ffa-89e3-467fa311aaab', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-06 11:27:23', '2026-05-06 11:27:23'),
('781ab03a-89cd-4bde-9206-af4881d2bab2', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-04 04:49:27', '2026-05-04 04:49:27'),
('7877f88c-082f-463d-a217-0f1a44926a65', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:34:17', '2026-05-03 06:34:17'),
('84d79f9a-bb2d-4f81-915f-b6c1fd939264', '836693fe-56e9-4452-9fa0-3a55d139bbd3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:38:28', '2026-05-03 06:38:28'),
('875041ed-d1e7-49c2-ba2b-c16625331f0b', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '21c71b94-7aa4-4410-83e4-f869cf8cec72', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:18:50', '2026-05-03 06:18:50'),
('9020e0ac-d6f7-464a-9213-801306e2338f', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:34:17', '2026-05-03 06:34:17'),
('94102899-93d4-48bd-b729-bd44b8aa8f74', '836693fe-56e9-4452-9fa0-3a55d139bbd3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:38:28', '2026-05-03 06:38:28'),
('96405bc3-2be7-4065-a6b5-0a83b8bb9fe0', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '21c71b94-7aa4-4410-83e4-f869cf8cec72', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:18:50', '2026-05-03 06:18:50'),
('979dc5a6-a2da-4abb-8f1a-4c3f43912cdc', '51902ea4-817a-405d-b8c9-dd2a20264eb3', 'ec769af1-6839-4b82-9c07-6751a6013e40', 'GRADED', 40.50, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:14:01', NULL, '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-03 06:13:50', '2026-05-03 06:14:01'),
('a0bec99b-811a-4078-9cfe-4e51860a3362', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 71.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:50:35', '2026-05-03 17:48:31', '983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', '2026-05-03 17:48:07', '2026-05-03 17:50:35'),
('a0c1a22f-1496-4593-b8d0-cddad9057850', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', '9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-06 11:27:13', '2026-05-06 11:27:13'),
('a716da04-d737-4353-b77c-9f9ec0bc13db', '51902ea4-817a-405d-b8c9-dd2a20264eb3', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 50.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:20:40', '2026-05-02 12:19:46', '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-02 12:19:46', '2026-05-02 12:20:40'),
('aa01897d-2e66-47d3-88b8-53f7da46979a', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', '9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'GRADED', 65.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:51:49', NULL, '6515316c-dc5c-464e-81c7-d5eb20a472be', '2026-05-04 04:51:29', '2026-05-04 04:51:49'),
('b0a5078c-20c0-46ec-97e2-f3fb50b6e229', '836693fe-56e9-4452-9fa0-3a55d139bbd3', '40c3f3a4-de93-428a-90ce-845c56d46ad7', 'GRADED', 25.50, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:38:45', '2026-05-03 06:38:34', '476b146a-f29a-4666-8dec-6f3043ebe1b3', '2026-05-03 06:38:28', '2026-05-03 06:38:45'),
('bb634e45-b677-45c1-8e17-a3ea721ff519', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '4d684e88-7e7b-4324-bd4f-fd752cdb1e76', 'GRADED', 38.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:15:07', NULL, '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-02 12:20:50', '2026-05-03 06:15:07'),
('c43b3191-e160-45fe-9bcd-03696001beee', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-03 17:48:07', '2026-05-03 17:48:07'),
('c7c0c2b8-dc4f-43c2-bedd-36b08290d832', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'GRADED', 47.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:15:50', NULL, '16566e5f-cee6-475c-b8a1-2224af9312c6', '2026-05-03 06:07:54', '2026-05-03 06:15:50'),
('d09e5bb1-a7e7-452d-aeac-1c21fc6729f7', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-04 04:49:27', '2026-05-04 04:49:27'),
('d75035b2-d923-4b0d-853f-fa5f38ab8285', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '21c71b94-7aa4-4410-83e4-f869cf8cec72', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:18:50', '2026-05-03 06:18:50'),
('de788124-82c5-48f7-8ea1-ee6903fc09a0', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-06 12:39:04', '2026-05-06 12:39:04'),
('e6a34314-3611-4f1c-a442-78163c6a94cd', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 79.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:50:58', '2026-05-04 04:49:39', '6515316c-dc5c-464e-81c7-d5eb20a472be', '2026-05-04 04:49:27', '2026-05-04 04:50:58'),
('e7ef8805-08f9-4e6d-a355-79ac0764a854', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-04 04:49:27', '2026-05-04 04:49:27'),
('ed904e03-90f9-4f88-8617-dd1ba01ddffa', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'IN_PROGRESS', NULL, NULL, NULL, NULL, NULL, '2026-05-06 12:39:04', '2026-05-06 12:39:04'),
('f0e34e81-b69b-4f1b-bc21-9651f608b1b1', '51902ea4-817a-405d-b8c9-dd2a20264eb3', '60c252ea-5170-415b-8b13-b4ced98ed01a', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-03 06:19:43', '2026-05-03 06:19:43'),
('f4268a4d-5746-400d-9788-dd9374dce420', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'GRADED', 54.50, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:26:42', '2026-05-06 11:26:08', '8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', '2026-05-06 11:25:56', '2026-05-06 11:26:42'),
('f9adb844-9b5e-420e-a6c6-ec6f8ea64521', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', 'SUBMITTED', NULL, NULL, NULL, NULL, NULL, '2026-05-04 04:53:16', '2026-05-04 04:53:16');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user1_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user2_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_messages`
--

CREATE TABLE `group_messages` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `group_type` enum('ACADEMIC_SESSION','SESSION_CATEGORY') NOT NULL,
  `group_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sender_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mentor_requirements`
--

CREATE TABLE `mentor_requirements` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `mentor_team_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `due_date` datetime DEFAULT NULL,
  `status` enum('ACTIVE','CLOSED','ARCHIVED') DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mentor_requirements`
--

INSERT INTO `mentor_requirements` (`id`, `mentor_team_id`, `created_by`, `title`, `description`, `due_date`, `status`, `created_at`, `updated_at`) VALUES
('04bcccda-f7da-4a4b-8408-ec2338cfa4e6', '20220572-3ca7-4fe3-9dc3-f987f65528f9', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', 'Project title', 'Post the Title of the project', NULL, 'ACTIVE', '2026-05-03 08:43:13', '2026-05-03 08:43:13'),
('3967cac7-784d-4eaf-8396-7a9fc80c408e', '419ef360-28cd-4a3d-8e64-90392c72cf2b', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', 'Enter Project Title', 'Project Title', NULL, 'ACTIVE', '2026-05-06 11:45:01', '2026-05-06 11:45:01'),
('3c2b52e8-835a-489f-af43-3da03f055ca0', '20220572-3ca7-4fe3-9dc3-f987f65528f9', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', 'Submission Report', 'Report of Submission', NULL, 'ACTIVE', '2026-05-04 05:04:42', '2026-05-04 05:04:42');

-- --------------------------------------------------------

--
-- Table structure for table `mentor_responses`
--

CREATE TABLE `mentor_responses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `requirement_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `student_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `response_text` text DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `status` enum('SUBMITTED','REVIEWED') DEFAULT 'SUBMITTED',
  `feedback` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mentor_responses`
--

INSERT INTO `mentor_responses` (`id`, `requirement_id`, `student_session_id`, `response_text`, `file_url`, `status`, `feedback`, `submitted_at`, `created_at`, `updated_at`) VALUES
('3e4b8276-b832-42ca-9679-816fc5b1e563', '04bcccda-f7da-4a4b-8408-ec2338cfa4e6', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', 'ok', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/mentor-responses/54ce70d8-bb5f-45ee-9fa7-6a03647c46f6-1777798354566.pdf', 'REVIEWED', 'Better', '2026-05-03 08:52:34', '2026-05-03 08:52:34', '2026-05-03 18:00:59'),
('43e5e77c-4fda-4215-a86f-ff7a7a8054d3', '3c2b52e8-835a-489f-af43-3da03f055ca0', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'PFA report', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/mentor-responses/c0ac9d0b-eff7-412f-b2fe-800d0c81eb40-1777871119569.pdf', 'REVIEWED', 'Good', '2026-05-04 05:05:20', '2026-05-04 05:05:20', '2026-05-04 05:07:28'),
('52beca50-37d5-4887-a4ad-d50f0149706c', '3967cac7-784d-4eaf-8396-7a9fc80c408e', '60c252ea-5170-415b-8b13-b4ced98ed01a', 'My Title', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/mentor-responses/d0aabb61-604f-4bb2-b8e1-1d8c0e139b7a-1778067985323.pdf', 'REVIEWED', 'Ok', '2026-05-06 11:46:25', '2026-05-06 11:46:25', '2026-05-06 11:47:01'),
('643e9d7b-00f6-4fa5-9e0e-bc609aad40dd', '04bcccda-f7da-4a4b-8408-ec2338cfa4e6', 'b0e182af-1219-452d-aef7-5f89c632f6fe', 'Good', NULL, 'REVIEWED', 'work on it', '2026-05-03 08:43:34', '2026-05-03 08:43:34', '2026-05-03 08:51:22'),
('9b9134c2-0ecb-4e45-b928-0d2e720446c3', '3967cac7-784d-4eaf-8396-7a9fc80c408e', '3908c915-1882-48be-9323-efb95c916669', 'fghjk', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/mentor-responses/ca110ed5-29c3-4fee-b89d-7090e9689c72-1778071503788.JPG', 'REVIEWED', 'good', '2026-05-06 12:45:04', '2026-05-06 12:45:04', '2026-05-06 12:45:24'),
('d00a4613-bd4f-4898-abd2-6ec76b14ae36', '04bcccda-f7da-4a4b-8408-ec2338cfa4e6', '3908c915-1882-48be-9323-efb95c916669', 'AI', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/mentor-responses/6b3d5bcb-8226-464b-8d85-ec48bed616f6-1777831324329.JPG', 'REVIEWED', 'Good', '2026-05-03 18:02:04', '2026-05-03 18:02:04', '2026-05-03 18:02:58');

-- --------------------------------------------------------

--
-- Table structure for table `mentor_teams`
--

CREATE TABLE `mentor_teams` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `faculty_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `team_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','ARCHIVED') DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mentor_teams`
--

INSERT INTO `mentor_teams` (`id`, `session_id`, `faculty_id`, `team_name`, `description`, `status`, `created_at`, `updated_at`) VALUES
('20220572-3ca7-4fe3-9dc3-f987f65528f9', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', 'Test', '', 'ACTIVE', '2026-05-03 08:37:22', '2026-05-03 08:37:22'),
('419ef360-28cd-4a3d-8e64-90392c72cf2b', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e469aad9-6670-498c-bc1a-ba4d8293ec68', 'Demo\'s Team', '', 'ACTIVE', '2026-05-06 11:43:27', '2026-05-06 11:43:27');

-- --------------------------------------------------------

--
-- Table structure for table `mentor_team_members`
--

CREATE TABLE `mentor_team_members` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `mentor_team_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `student_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `joined_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mentor_team_members`
--

INSERT INTO `mentor_team_members` (`id`, `mentor_team_id`, `student_session_id`, `joined_at`, `created_at`, `updated_at`) VALUES
('02eadc31-c443-466a-9e9b-7800c66c22a1', '20220572-3ca7-4fe3-9dc3-f987f65528f9', '60c252ea-5170-415b-8b13-b4ced98ed01a', '2026-05-03 08:40:18', '2026-05-03 08:40:18', '2026-05-03 08:40:18'),
('1323d680-b4b3-472e-b5f4-8311eb4d2a5f', '419ef360-28cd-4a3d-8e64-90392c72cf2b', '60c252ea-5170-415b-8b13-b4ced98ed01a', '2026-05-06 11:43:27', '2026-05-06 11:43:27', '2026-05-06 11:43:27'),
('395dfd81-d7c2-44c4-a064-9b2caad6cf77', '419ef360-28cd-4a3d-8e64-90392c72cf2b', '3908c915-1882-48be-9323-efb95c916669', '2026-05-06 11:43:27', '2026-05-06 11:43:27', '2026-05-06 11:43:27'),
('5fb84a35-f1a7-49cc-8fff-9320af111470', '20220572-3ca7-4fe3-9dc3-f987f65528f9', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', '2026-05-03 08:37:22', '2026-05-03 08:37:22', '2026-05-03 08:37:22'),
('65c87c18-7d26-45a3-b21e-cce7ec789901', '419ef360-28cd-4a3d-8e64-90392c72cf2b', '57bbd31b-2b99-42f0-b015-01eb7e7f78f6', '2026-05-06 11:43:27', '2026-05-06 11:43:27', '2026-05-06 11:43:27'),
('7c4d28db-75cc-47f7-9c48-bd8b6c9f7107', '20220572-3ca7-4fe3-9dc3-f987f65528f9', 'b0e182af-1219-452d-aef7-5f89c632f6fe', '2026-05-03 08:37:22', '2026-05-03 08:37:22', '2026-05-03 08:37:22'),
('9868b78d-52bc-490e-bf62-513bcdd6961a', '419ef360-28cd-4a3d-8e64-90392c72cf2b', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', '2026-05-06 11:43:27', '2026-05-06 11:43:27', '2026-05-06 11:43:27'),
('9a098289-3f2e-464e-8a83-cbb6602238e2', '20220572-3ca7-4fe3-9dc3-f987f65528f9', '3908c915-1882-48be-9323-efb95c916669', '2026-05-03 17:58:25', '2026-05-03 17:58:25', '2026-05-03 17:58:25'),
('ea7310e3-976d-4a51-bd82-7c67f517f80e', '419ef360-28cd-4a3d-8e64-90392c72cf2b', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', '2026-05-06 11:43:27', '2026-05-06 11:43:27', '2026-05-06 11:43:27');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sender_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `recipient_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_files`
--

CREATE TABLE `message_files` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `message_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `file_type` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `s3_key` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` enum('ADMIN','HOD','FACULTY','COORDINATOR','PLACEMENT_COORDINATOR','TRAINER','STUDENT','MENTOR') NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `permissions`, `created_at`, `updated_at`) VALUES
('7a373c9f-c20e-492b-8c7a-b1874c1c65aa', 'ADMIN', NULL, '{}', '2026-05-02 11:58:17', '2026-05-02 11:58:17'),
('a5522165-4285-47d2-a7ee-4539658c00e1', 'STUDENT', 'STUDENT role', '{}', '2026-05-03 07:33:21', '2026-05-03 07:33:21');

-- --------------------------------------------------------

--
-- Table structure for table `rubrics`
--

CREATE TABLE `rubrics` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assessment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `total_points` decimal(5,2) DEFAULT 0.00,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rubrics`
--

INSERT INTO `rubrics` (`id`, `assessment_id`, `name`, `description`, `total_points`, `created_by`, `created_at`, `updated_at`) VALUES
('16566e5f-cee6-475c-b8a1-2224af9312c6', '51902ea4-817a-405d-b8c9-dd2a20264eb3', 'demo Rubrics', '', 90.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:20:27', '2026-05-02 12:20:27'),
('476b146a-f29a-4666-8dec-6f3043ebe1b3', '836693fe-56e9-4452-9fa0-3a55d139bbd3', 'Test', '', 50.00, 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 06:05:34', '2026-05-03 06:05:34'),
('5b79757c-381d-4f81-904f-3f4ba26b8e16', '30204709-72b0-45b2-86f6-f7a8bfb2c860', 'Assessment', '', 50.00, '8daf0158-3616-42b9-be00-06a31b9dad0b', '2026-05-03 07:14:55', '2026-05-03 07:14:55'),
('6515316c-dc5c-464e-81c7-d5eb20a472be', 'ae8b72b0-7785-4a7f-a170-fcdb06e2d1bc', 'Final', '', 100.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:48:40', '2026-05-04 04:48:40'),
('872f81a9-9768-4fbb-aade-6ce2191c38dd', '1e234db5-c602-47cf-9ede-e27fdfe9cb79', 'Final', '', 100.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 12:40:24', '2026-05-06 12:40:24'),
('8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', '4df650ff-d3ed-4b6a-961c-3a51d15f7644', 'Main', '', 100.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:25:28', '2026-05-06 11:25:28'),
('983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', '9c97bb62-e342-45d1-bf21-a625f442a8f1', 'Mid term Rubrics', '', 100.00, '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:47:07', '2026-05-03 17:47:07');

-- --------------------------------------------------------

--
-- Table structure for table `rubric_criteria`
--

CREATE TABLE `rubric_criteria` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `rubric_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `criteria_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `max_points` decimal(5,2) NOT NULL,
  `order_index` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rubric_criteria`
--

INSERT INTO `rubric_criteria` (`id`, `rubric_id`, `question_id`, `criteria_name`, `description`, `max_points`, `order_index`, `created_at`, `updated_at`) VALUES
('03fb92c7-c880-40a9-a37d-e0fe477eed30', '6515316c-dc5c-464e-81c7-d5eb20a472be', NULL, 'Content', '', 25.00, 1, '2026-05-04 04:48:40', '2026-05-04 04:48:40'),
('1ecb652e-1a8d-43ee-aa34-758d5f455fc3', '872f81a9-9768-4fbb-aade-6ce2191c38dd', NULL, 'Skills', '', 75.00, 1, '2026-05-06 12:40:24', '2026-05-06 12:40:24'),
('495372d5-f4cb-4ef9-8d19-4f1e95e53de7', '6515316c-dc5c-464e-81c7-d5eb20a472be', NULL, 'Quality', '', 25.00, 0, '2026-05-04 04:48:40', '2026-05-04 04:48:40'),
('518adadc-4956-4c0f-a699-65890b614e58', '8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', '6a82adb6-bbf8-4d4c-89da-c77eb5e487bf', 'Knowledge', '', 50.00, 2, '2026-05-06 11:25:28', '2026-05-06 11:25:28'),
('5549122c-0552-4f7c-af8e-336a9cb66ecb', '16566e5f-cee6-475c-b8a1-2224af9312c6', NULL, 'Cretivity', '', 50.00, 1, '2026-05-02 12:20:27', '2026-05-02 12:20:27'),
('5d2b4fce-cc06-4e46-816c-eeec146f5778', '983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', NULL, 'Skills', '', 25.00, 0, '2026-05-03 17:47:07', '2026-05-03 17:47:07'),
('5d80f971-1ff8-45c4-83f5-1e8e6da0c670', '16566e5f-cee6-475c-b8a1-2224af9312c6', NULL, 'Skill', '', 40.00, 0, '2026-05-02 12:20:27', '2026-05-02 12:20:27'),
('62b96443-1d51-44f5-a7ed-5e2d64225423', '8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', NULL, 'Content Quality', '', 25.00, 0, '2026-05-06 11:25:28', '2026-05-06 11:25:28'),
('668d3830-b21c-4e6e-b3aa-279d3c01bcf6', '6515316c-dc5c-464e-81c7-d5eb20a472be', NULL, 'Skills', '', 50.00, 2, '2026-05-04 04:48:40', '2026-05-04 04:48:40'),
('6f3fcaee-b960-484c-96ac-6d06ebed6535', '8aeeeb71-fbe5-4df7-b4a6-aff7cb7f7e90', NULL, 'Skill', '', 25.00, 1, '2026-05-06 11:25:28', '2026-05-06 11:25:28'),
('723f440b-8ecd-44d1-bba5-3998c775560f', '476b146a-f29a-4666-8dec-6f3043ebe1b3', NULL, 'Content', '', 30.00, 0, '2026-05-03 06:05:34', '2026-05-03 06:05:34'),
('8017c916-7b64-43d8-a3ad-b335466dfe2f', '476b146a-f29a-4666-8dec-6f3043ebe1b3', NULL, 'Skill', '', 20.00, 1, '2026-05-03 06:05:34', '2026-05-03 06:05:34'),
('88876be7-5319-48ce-8416-c5f32aa63cab', '983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', NULL, 'Soft Skills', '', 50.00, 2, '2026-05-03 17:47:07', '2026-05-03 17:47:07'),
('edb5a1d9-dc91-40ff-b6fd-faf6f2aa66eb', '872f81a9-9768-4fbb-aade-6ce2191c38dd', NULL, 'Content', '', 25.00, 0, '2026-05-06 12:40:24', '2026-05-06 12:40:24'),
('eef58150-50a1-4c10-8478-9932f3f747b0', '5b79757c-381d-4f81-904f-3f4ba26b8e16', NULL, 'CR', '', 50.00, 0, '2026-05-03 07:14:55', '2026-05-03 07:14:55'),
('f2439884-8402-48ea-8011-f17b2103a59e', '983f7fe9-463e-44b8-9ebf-ebfaa3a49d1f', NULL, 'Quality of Content', '', 25.00, 1, '2026-05-03 17:47:07', '2026-05-03 17:47:07');

-- --------------------------------------------------------

--
-- Table structure for table `rubric_scores`
--

CREATE TABLE `rubric_scores` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `submission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `rubric_criteria_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `feedback` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rubric_scores`
--

INSERT INTO `rubric_scores` (`id`, `submission_id`, `rubric_criteria_id`, `score`, `feedback`, `created_at`, `updated_at`) VALUES
('0323bb73-6c5f-4516-9e5f-12d3798b7613', '04457082-e0f8-4ad6-8d29-f35aa5d89052', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 24.00, NULL, '2026-05-03 06:13:43', '2026-05-03 06:13:43'),
('05d4cec1-3b15-4ae3-b483-b5384ddb09b2', '00eceac4-f197-4cfc-823d-3a4052496d21', '5d2b4fce-cc06-4e46-816c-eeec146f5778', 17.00, NULL, '2026-05-03 17:51:33', '2026-05-03 17:51:33'),
('086f3f02-ae45-4f57-8d8e-86da8a8afaf2', '3c076677-d97e-4e0c-ade1-868983a45886', '1ecb652e-1a8d-43ee-aa34-758d5f455fc3', 42.00, NULL, '2026-05-06 12:41:57', '2026-05-06 12:41:57'),
('087e7440-bd97-430c-906d-f2c7a794a6b4', '217c9c29-970b-4e1d-bd11-553c9168770b', '668d3830-b21c-4e6e-b3aa-279d3c01bcf6', 37.00, 'feedback', '2026-05-04 04:53:36', '2026-05-04 04:53:36'),
('10b4c27e-97c3-4df1-9b47-7b01814fb3ed', 'bb634e45-b677-45c1-8e17-a3ea721ff519', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 8.00, 'Good', '2026-05-03 06:15:07', '2026-05-03 06:15:07'),
('1106514f-7b11-475c-ba22-50a694f29e57', '217c9c29-970b-4e1d-bd11-553c9168770b', '495372d5-f4cb-4ef9-8d19-4f1e95e53de7', 19.00, NULL, '2026-05-04 04:53:36', '2026-05-04 04:53:36'),
('1459fc89-ba5c-444c-b578-cce52ee1f6ae', 'c7c0c2b8-dc4f-43c2-bedd-36b08290d832', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 20.00, 'Ok', '2026-05-03 06:15:50', '2026-05-03 06:15:50'),
('18e8d595-6982-40b7-9360-21c3070abad8', '04457082-e0f8-4ad6-8d29-f35aa5d89052', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 21.50, NULL, '2026-05-03 06:13:43', '2026-05-03 06:13:43'),
('20acad54-6f79-453b-af96-72565fc32dc1', 'f4268a4d-5746-400d-9788-dd9374dce420', '518adadc-4956-4c0f-a699-65890b614e58', 28.00, 'Good', '2026-05-06 11:26:42', '2026-05-06 11:26:42'),
('21bdf465-6efc-4b6a-8f76-80d0dfeacbc5', '4953fb33-21dd-4abe-8a6f-7fd5bf065b3d', '6f3fcaee-b960-484c-96ac-6d06ebed6535', 25.00, NULL, '2026-05-06 11:28:05', '2026-05-06 11:28:05'),
('2566a13c-1d34-4a88-9b8a-9c9a2fd742de', 'a0bec99b-811a-4078-9cfe-4e51860a3362', 'f2439884-8402-48ea-8011-f17b2103a59e', 19.00, NULL, '2026-05-03 17:50:35', '2026-05-03 17:50:35'),
('345fc357-6e48-4828-937b-65e3de33a95c', '07f180a5-6c10-4fa3-a456-e43a55ceda13', '1ecb652e-1a8d-43ee-aa34-758d5f455fc3', 33.50, 'Good', '2026-05-06 12:41:05', '2026-05-06 12:41:05'),
('3690101f-257c-4c6a-a6ee-e40d2391a57a', '00eceac4-f197-4cfc-823d-3a4052496d21', '88876be7-5319-48ce-8416-c5f32aa63cab', 23.50, NULL, '2026-05-03 17:51:33', '2026-05-03 17:51:33'),
('4689a033-9f7f-468d-8d05-2c993247c589', '07f180a5-6c10-4fa3-a456-e43a55ceda13', 'edb5a1d9-dc91-40ff-b6fd-faf6f2aa66eb', 25.00, 'bad', '2026-05-06 12:41:05', '2026-05-06 12:41:05'),
('47c60dcc-c5eb-4965-a9b0-2598ae70fa9d', 'f4268a4d-5746-400d-9788-dd9374dce420', '62b96443-1d51-44f5-a7ed-5e2d64225423', 8.50, NULL, '2026-05-06 11:26:42', '2026-05-06 11:26:42'),
('5506d949-8dba-40ae-9f28-e57c55f17419', '2c2dde82-f059-4c9e-a779-1aa22c65f48d', '723f440b-8ecd-44d1-bba5-3998c775560f', 20.00, 'fair', '2026-05-03 07:57:58', '2026-05-03 07:57:58'),
('65b9a187-e77d-4f01-be02-a8ba408ae9e2', 'a0bec99b-811a-4078-9cfe-4e51860a3362', '5d2b4fce-cc06-4e46-816c-eeec146f5778', 14.00, 'Good', '2026-05-03 17:50:35', '2026-05-03 17:50:35'),
('66a815d8-af45-4a06-87bd-865ef0bb500e', '4953fb33-21dd-4abe-8a6f-7fd5bf065b3d', '518adadc-4956-4c0f-a699-65890b614e58', 24.00, 'Good', '2026-05-06 11:28:05', '2026-05-06 11:28:05'),
('675fafcc-562b-4157-ab7a-375279dc5ba1', 'b0a5078c-20c0-46ec-97e2-f3fb50b6e229', '723f440b-8ecd-44d1-bba5-3998c775560f', 21.00, NULL, '2026-05-03 06:38:45', '2026-05-03 06:38:45'),
('6e80c9a7-27b5-485e-9ca5-9b71577553be', '477cbd31-5f83-4bdb-8c71-827f232da6ab', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 32.00, 'ok', '2026-05-03 06:34:44', '2026-05-03 06:34:44'),
('79950899-2967-4fd1-b62c-88d0cf7a81ae', '4953fb33-21dd-4abe-8a6f-7fd5bf065b3d', '62b96443-1d51-44f5-a7ed-5e2d64225423', 21.50, NULL, '2026-05-06 11:28:05', '2026-05-06 11:28:05'),
('83f76b01-5b38-42f0-9ed7-9ba7b1a5a586', '979dc5a6-a2da-4abb-8f1a-4c3f43912cdc', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 30.00, NULL, '2026-05-03 06:14:01', '2026-05-03 06:14:01'),
('8bc3fabe-16a8-4d44-ae60-2d4eac60ed78', '00eceac4-f197-4cfc-823d-3a4052496d21', 'f2439884-8402-48ea-8011-f17b2103a59e', 18.00, NULL, '2026-05-03 17:51:33', '2026-05-03 17:51:33'),
('9f77c651-3aa8-4eba-b4be-8d67ea4e2974', '217c9c29-970b-4e1d-bd11-553c9168770b', '03fb92c7-c880-40a9-a37d-e0fe477eed30', 20.00, NULL, '2026-05-04 04:53:36', '2026-05-04 04:53:36'),
('a2e6f30c-e013-40bf-8b15-ad34b8163061', 'a716da04-d737-4353-b77c-9f9ec0bc13db', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 29.50, NULL, '2026-05-02 12:20:39', '2026-05-02 12:20:39'),
('b17025b5-1478-4669-bc7c-904dea41c922', 'e6a34314-3611-4f1c-a442-78163c6a94cd', '03fb92c7-c880-40a9-a37d-e0fe477eed30', 16.00, 'Bad, can Do better', '2026-05-04 04:50:58', '2026-05-04 04:50:58'),
('c4e8a89a-1e4a-484c-834a-b6432cfa7ebc', 'aa01897d-2e66-47d3-88b8-53f7da46979a', '668d3830-b21c-4e6e-b3aa-279d3c01bcf6', 39.00, NULL, '2026-05-04 04:51:49', '2026-05-04 04:51:49'),
('c9487441-ef9e-4538-b0f1-abbc61701966', 'bb634e45-b677-45c1-8e17-a3ea721ff519', '5549122c-0552-4f7c-af8e-336a9cb66ecb', 30.00, NULL, '2026-05-03 06:15:07', '2026-05-03 06:15:07'),
('d0087bc4-65bd-4f8b-91f9-3956a5329438', 'e6a34314-3611-4f1c-a442-78163c6a94cd', '495372d5-f4cb-4ef9-8d19-4f1e95e53de7', 13.00, NULL, '2026-05-04 04:50:58', '2026-05-04 04:50:58'),
('d1837efe-e1e6-4d39-9d0e-a9fed82a8fda', 'e6a34314-3611-4f1c-a442-78163c6a94cd', '668d3830-b21c-4e6e-b3aa-279d3c01bcf6', 50.00, NULL, '2026-05-04 04:50:58', '2026-05-04 04:50:58'),
('d303b3aa-c9c9-4c67-b3ea-2f7b38c81d72', 'b0a5078c-20c0-46ec-97e2-f3fb50b6e229', '8017c916-7b64-43d8-a3ad-b335466dfe2f', 4.50, NULL, '2026-05-03 06:38:45', '2026-05-03 06:38:45'),
('d7f8d80b-a37e-4560-9ba1-e00755a2a1cb', '2c2dde82-f059-4c9e-a779-1aa22c65f48d', '8017c916-7b64-43d8-a3ad-b335466dfe2f', 7.00, 'decent', '2026-05-03 07:57:58', '2026-05-03 07:57:58'),
('da79c626-aa3b-4f8a-95dc-c6ddfb812311', 'c7c0c2b8-dc4f-43c2-bedd-36b08290d832', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 27.00, NULL, '2026-05-03 06:15:50', '2026-05-03 06:15:50'),
('e50eec5d-d86d-4d3c-ae7e-4f5919e6c0b7', 'a0bec99b-811a-4078-9cfe-4e51860a3362', '88876be7-5319-48ce-8416-c5f32aa63cab', 38.00, 'Not up to the mark', '2026-05-03 17:50:35', '2026-05-03 17:50:35'),
('e54d9ab3-4998-4d49-8cf8-be874a714ef7', '477cbd31-5f83-4bdb-8c71-827f232da6ab', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 18.00, 'Good', '2026-05-03 06:34:44', '2026-05-03 06:34:44'),
('eb73fc10-dd9b-4b6d-8d92-a70d412e3e9d', 'aa01897d-2e66-47d3-88b8-53f7da46979a', '03fb92c7-c880-40a9-a37d-e0fe477eed30', 14.50, NULL, '2026-05-04 04:51:49', '2026-05-04 04:51:49'),
('ed7fba9c-2dc1-4e14-a15b-01e94d287bf1', '3c076677-d97e-4e0c-ade1-868983a45886', 'edb5a1d9-dc91-40ff-b6fd-faf6f2aa66eb', 12.50, NULL, '2026-05-06 12:41:57', '2026-05-06 12:41:57'),
('f0dab9d3-5637-4ef9-84e3-abc331b29d25', 'f4268a4d-5746-400d-9788-dd9374dce420', '6f3fcaee-b960-484c-96ac-6d06ebed6535', 18.00, NULL, '2026-05-06 11:26:42', '2026-05-06 11:26:42'),
('f20f23e5-1210-4bbf-bb7c-11e67f640f22', 'aa01897d-2e66-47d3-88b8-53f7da46979a', '495372d5-f4cb-4ef9-8d19-4f1e95e53de7', 12.00, NULL, '2026-05-04 04:51:49', '2026-05-04 04:51:49'),
('f9387c24-0812-4ce2-b931-8aeb70eeb0ec', 'a716da04-d737-4353-b77c-9f9ec0bc13db', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 20.50, NULL, '2026-05-02 12:20:39', '2026-05-02 12:20:39'),
('fb4c84bd-09aa-4698-81f5-b9cfbd0f6e62', '979dc5a6-a2da-4abb-8f1a-4c3f43912cdc', '5d80f971-1ff8-45c4-83f5-1e8e6da0c670', 10.50, NULL, '2026-05-03 06:14:01', '2026-05-03 06:14:01');

-- --------------------------------------------------------

--
-- Table structure for table `session_categories`
--

CREATE TABLE `session_categories` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `academic_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(255) DEFAULT '#3B82F6',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `session_categories`
--

INSERT INTO `session_categories` (`id`, `academic_session_id`, `name`, `description`, `color`, `created_at`, `updated_at`) VALUES
('20af5eb8-8af0-44fe-910e-fd10e5684140', '14ef0337-9de9-4f2d-9938-e65401a9afb3', 'MArketing batch 2', '', '#3B82F6', '2026-05-03 07:41:05', '2026-05-03 07:41:05'),
('5a21e9a0-83b9-4f25-89e5-3e23cf9449be', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'Finance', '', '#3B82F6', '2026-05-03 17:38:52', '2026-05-03 17:38:52'),
('81ff337c-c833-4aaa-95d5-575263414da7', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'Section A', '', '#EF4444', '2026-05-02 12:17:28', '2026-05-02 12:17:59'),
('8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'SEC D', '', '#EF4444', '2026-05-06 11:33:32', '2026-05-06 11:33:32'),
('9dbc9625-4c25-4854-9a53-f431045f6cc4', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'Section B', '', '#EF4444', '2026-05-03 17:39:51', '2026-05-03 17:39:51'),
('b55d5c46-c0e6-4485-bb95-37ce0db860e0', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'HR', '', '#3B82F6', '2026-05-04 04:33:51', '2026-05-04 04:33:51'),
('dd0f72b8-9ca6-4489-9d5f-ee61d29bea0b', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'Marketing', '', '#3B82F6', '2026-05-02 12:17:20', '2026-05-02 12:17:20');

-- --------------------------------------------------------

--
-- Table structure for table `student_profiles`
--

CREATE TABLE `student_profiles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `father_occupation` varchar(255) DEFAULT NULL,
  `father_occupation_description` text DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `mother_occupation` varchar(255) DEFAULT NULL,
  `mother_occupation_description` text DEFAULT NULL,
  `guardian_phone` varchar(255) DEFAULT NULL,
  `residential_status` enum('HOSTELLER','DAY_SCHOLAR','OTHER') DEFAULT NULL,
  `about_me` text DEFAULT NULL,
  `career_objective` text DEFAULT NULL,
  `interests` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interests`)),
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `co_scholastic_expertise` varchar(255) DEFAULT NULL,
  `co_scholastic_description` text DEFAULT NULL,
  `has_work_experience` tinyint(1) DEFAULT 0,
  `work_experiences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`work_experiences`)),
  `achievements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`achievements`)),
  `certifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`certifications`)),
  `projects` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`projects`)),
  `positions_of_responsibility` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`positions_of_responsibility`)),
  `linkedin` varchar(255) DEFAULT NULL,
  `github` varchar(255) DEFAULT NULL,
  `portfolio` varchar(255) DEFAULT NULL,
  `coursera` varchar(255) DEFAULT NULL,
  `other_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`other_links`)),
  `languages_known` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`languages_known`)),
  `hobbies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`hobbies`)),
  `strengths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`strengths`)),
  `areas_of_improvement` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`areas_of_improvement`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `resume` varchar(1024) DEFAULT NULL,
  `certificate_documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' CHECK (json_valid(`certificate_documents`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_profiles`
--

INSERT INTO `student_profiles` (`id`, `father_name`, `father_occupation`, `father_occupation_description`, `mother_name`, `mother_occupation`, `mother_occupation_description`, `guardian_phone`, `residential_status`, `about_me`, `career_objective`, `interests`, `skills`, `co_scholastic_expertise`, `co_scholastic_description`, `has_work_experience`, `work_experiences`, `achievements`, `certifications`, `projects`, `positions_of_responsibility`, `linkedin`, `github`, `portfolio`, `coursera`, `other_links`, `languages_known`, `hobbies`, `strengths`, `areas_of_improvement`, `created_at`, `updated_at`, `user_id`, `resume`, `certificate_documents`) VALUES
('161b2f66-5ab6-4145-b7e7-558cbd0f16d3', '', '', '', '', '', '', '', 'DAY_SCHOLAR', '', '', '[\"Finance\"]', '[\"Coding\",\"AI\",\"Tech\"]', '', '', 1, '[{\"organization\":\"PWC\",\"role\":\"Analyst\",\"duration\":\"Jan 2023-Dec 2023\",\"description\":\"\"}]', '[\"as\",\"asassa\"]', '[\"asas\",\"asas\"]', '[]', '[]', '', '', '', '', '[]', '[\"Hindi\",\"English\"]', '[]', '[]', '[]', '2026-05-02 12:22:28', '2026-05-06 11:38:24', '77c3aa27-aace-4c00-8c5d-132e7bf22003', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/student-resumes/87c4bdb2-7d9f-410b-ad55-a8718d1d8143-1777786854868.pdf', '[{\"id\":\"261b3bf7-c29d-4c66-b09c-62b7fed8287b\",\"name\":\"request-13-export.pdf\",\"url\":\"https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/student-certificates/8780733b-872a-4164-ab23-a8eb7edba3af-1777728004886.pdf\",\"uploadedAt\":\"2026-05-02T13:20:05.072Z\"},{\"id\":\"3c4d5c78-fb47-48ff-9e39-9fca70e0aea2\",\"name\":\"Prasasti Pundir_Profile.pdf\",\"url\":\"https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/student-certificates/763a7958-4a63-417b-92e9-ce6a9a50ca79-1777830889088.pdf\",\"uploadedAt\":\"2026-05-03T17:54:49.349Z\"}]'),
('5c9ace4e-a0c9-4984-bab3-5b182bf50260', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', NULL, NULL, 0, '[]', '[]', '[]', '[]', '[]', NULL, NULL, NULL, NULL, '[]', '[]', '[]', '[]', '[]', '2026-05-03 06:19:40', '2026-05-03 06:19:40', 'a75a064a-c00e-435f-a2e5-bfb185671494', NULL, '[]'),
('c69a7c04-4b1c-4d5a-ad72-d15d1d8e8790', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', NULL, NULL, 0, '[]', '[]', '[]', '[]', '[]', NULL, NULL, NULL, NULL, '[]', '[]', '[]', '[]', '[]', '2026-05-03 08:47:05', '2026-05-03 08:47:05', '716914b2-99ce-4d95-add8-eec3ea569915', NULL, '[]'),
('e517c90d-1035-46f5-a900-a5c4f7d7ebf3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', NULL, NULL, 0, '[]', '[]', '[]', '[]', '[]', NULL, NULL, NULL, NULL, '[]', '[]', '[]', '[]', '[]', '2026-05-02 13:25:33', '2026-05-02 13:25:33', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', NULL, '[]');

-- --------------------------------------------------------

--
-- Table structure for table `student_sessions`
--

CREATE TABLE `student_sessions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('ONBOARDED','DROPPED','COMPLETED','PENDING') DEFAULT 'ONBOARDED',
  `enrollment_date` datetime DEFAULT NULL,
  `onboarded_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `academic_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_sessions`
--

INSERT INTO `student_sessions` (`id`, `status`, `enrollment_date`, `onboarded_by`, `created_at`, `updated_at`, `academic_session_id`, `user_id`) VALUES
('003837c5-8c56-4eb4-95b8-8189fc129a22', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1a22bc7b-9aaa-4970-b5dc-484713c3737e'),
('016a4838-865b-40dc-8066-afedc2e6a787', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c1f32d18-682c-4332-9556-b68a449a5711'),
('0261419c-fa29-4c48-9778-4ef8c8a15c6c', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '7887f9f9-b1da-4d94-8e9e-1a87a5c0228e'),
('02a675e0-869e-4088-a2d6-8619bd1c525d', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f09f812a-7d36-479a-be7f-2be43ad99957'),
('032a1b93-e771-45a5-85b7-5772ea41ba03', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f61805ac-dfe1-44bb-9551-87277a36f5bb'),
('035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '716914b2-99ce-4d95-add8-eec3ea569915'),
('049e408f-72c3-41a4-bb16-60fae4f6f61b', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', '055e119b-9471-4106-8d3f-1f89ebe21ac1'),
('05df5399-4e9b-4da8-b5a8-033ec0cfdf42', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8af6d1ac-1704-4062-8059-5552165b6aab'),
('065ddfaa-f0cd-4926-8684-92c569419152', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '24ce0038-2f04-473d-9a26-b26f5eee94b4'),
('07706030-3106-4534-aa6e-0289f9fdbe82', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1ad22d86-7ea5-4943-908a-c75ccf38cb3f'),
('0963a19c-69a0-440a-a1f3-3062810b5f55', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '587d2900-a195-4342-9313-c0f68c2c38b0'),
('0a4eab12-c2cd-47d6-9519-41b8fdb1ea07', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8688d329-4731-425f-9373-f8f343a41bf0'),
('0a6c9c53-941d-4df5-82cb-a1a6b70f2618', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '63b7c75f-502f-4bab-8366-2762f17cb711'),
('0bb6862d-82a6-42fd-bed5-275ad07e5721', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '7d9be8bf-aa16-4203-9312-e5ad36112a16'),
('0c3eae2a-0576-4a0e-a50c-1219f4a059b2', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1f8cf326-355e-4c38-8bda-c65e20b64eb5'),
('0c6fd36d-7394-4300-9d9a-703fc2b92798', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5a1138d4-bda6-4d95-be00-12949d0e48b8'),
('0d7e5264-b27d-4cda-bc4d-a6498df8f97e', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ac54be9e-bd35-4c83-a6d4-c55101fdd980'),
('0d9398a0-d3f0-4623-b013-5ba23b0b1e93', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bee985a2-03b5-4666-a8b4-b5ae65283220'),
('0de70e1c-0c3b-4670-b54e-78faf6586332', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4e363dce-9d60-4b72-b9de-9a90f435999e'),
('0fab530b-5046-4263-b44e-63f50e8fe926', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b0916e29-354c-46c5-a457-ff82c1e11793'),
('0fcb43b0-8df0-48d5-aed6-b5bc993b2eed', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '282a3c0e-9b51-472f-b1c8-b27b3e83bd35'),
('111efa15-5454-49bb-b3df-68a8417b70f7', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '01eb9224-f719-4cb7-aae1-2d961768d975'),
('117095fe-3b5d-4aa2-b8e7-2a35b4362c5d', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '69e5defd-db2f-4b89-903e-b14fdd18069d'),
('15fea819-dc83-4b92-9515-7649bd7141e4', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '31759ef5-23af-4af7-bd12-0ead5e6f4c56'),
('17f0121c-0361-4cb9-bfd6-069ff34fe981', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1895f85c-3012-4610-bc24-da316e3c3320'),
('1894cd66-fdb3-4eff-8ad7-c7aec5dc5798', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '769fd406-6765-4b33-9b60-3cff99b74101'),
('18ba8d69-f5ca-4d45-a504-fc928a0b7cd7', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f62bfd92-993d-4b7a-a3ac-7c006afdf021'),
('18dffb53-3021-4a53-8f62-f0649a3ce150', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5f2d7cf2-5d21-4925-85ea-1e624bbfae63'),
('19fd65d7-c097-4ed1-952b-cf762d481733', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5c4a337f-be18-419e-ade6-d7a1c5d3a633'),
('1a20943a-6505-4313-8460-dbef0848d661', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c856c723-c8f4-4ea2-b65c-21e6e1c8e368'),
('1c5bd890-fab5-48da-b8bd-2936ce814ca9', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1c4a5a49-190e-4890-a024-00ba70cedc5d'),
('1c6a6efa-bb1b-4407-aeb1-a499a4025025', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a6b62b9a-195e-4ecd-a8cb-ce5e8ad1a710'),
('1e47f552-9590-4fd4-a4b2-51f42aad004f', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1d08f147-df7f-4ac9-a82c-8e7ffe485fe1'),
('1eae014f-d2be-42db-bc1d-f12e1ef8b691', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0f270025-f73a-4ccd-aa0d-bcb8d0567c71'),
('21c71b94-7aa4-4410-83e4-f869cf8cec72', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c12e0340-7079-46e3-9b28-6e400c46e032'),
('230ae0ba-89e5-4e0a-849b-351aeb0c73f9', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '324e1fbf-d244-4d68-bdb2-1db2f8ce23b3'),
('2739e790-977f-4a91-b94f-8628f513b2fb', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3701ebd3-dfcd-46cd-a5fe-41c3f9369ecd'),
('2743e547-7399-4285-b580-574c726499c4', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bae758df-07cb-4e2a-995b-ea9c8e00d3ef'),
('29aff0cc-1eaf-4321-b574-c76078a59a1e', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'd7f40417-ab6f-4ea8-8175-be8d745e8354'),
('29eb2f23-866a-4bb5-a983-b84f67eefe5c', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b3215b11-bf46-427a-9869-166ac7fed354'),
('2a991730-f7a4-4f83-9333-bac1d2e1e308', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ac0dc64a-b51f-4862-a539-dd563e84dd98'),
('2a9d7bb3-3c2c-4cf2-9e61-1525ad0bedf1', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'd56bb123-954b-4266-929d-13fe935b7c91'),
('2ce26561-8be8-44cc-9bd9-74ba014c63c0', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c15200ee-d10e-4fa7-a16a-f1e42374f782'),
('2d508dea-429d-44c1-942e-a8be0a6bef43', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a4b2ea94-42e2-46c1-8327-25da50ceb847'),
('2e66d638-23b4-441d-8821-b412b74e3ca7', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bb1cfc1-08ea-4d2c-b526-fc7866d252aa'),
('2fd5b599-4cc6-4ce7-91db-3c5f027d7e83', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0a1d9789-4cc2-4540-b342-0992de434af1'),
('308b9f0d-4510-40fe-86ae-2ee1cbdcdfa9', 'ONBOARDED', '2026-05-03 07:34:30', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 07:34:30', '2026-05-03 07:34:30', '14ef0337-9de9-4f2d-9938-e65401a9afb3', '7fcff274-865c-4a31-b639-bf21e8690e35'),
('30f03c3f-c48e-4c4d-bf80-df4daa1279f7', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5cf186c8-2b25-48cb-a09b-2966de860d3c'),
('31269111-5247-430c-aabb-6a3507b22cfb', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'aa28398a-25d7-471a-a2de-a0e2b0b3d5b9'),
('31313dbc-d912-4735-af83-08528f23b688', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '603e3b7c-b1ce-48c7-841c-955139416723'),
('31e90197-e6c7-46f0-87a1-abb58ac40287', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8f6f28bc-7ce1-40f4-9430-2f42cdfd6441'),
('32e6aeaf-1c6d-43a9-b9e4-7d90a8e9fb1d', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '747a702e-2d5c-46eb-ba9e-3432c881eaf2'),
('33196e3d-a1e1-482c-ae5d-fed66aa32635', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '728061ba-dbb3-4067-90b2-289043b070ee'),
('3336ec84-7b83-43fe-8bb8-a48901c73699', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e611910f-2192-4ecd-958f-ef11427768eb'),
('35ae8d77-e9e6-4cdb-9a8a-35974bbee16a', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ef57dac0-7915-4d03-a51b-463af7927e46'),
('36589ead-7f44-45ea-99aa-3f4dc3dc61d8', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a7912047-86d3-49a4-8388-6c20fe8357f1'),
('37fe93ba-f061-4ec5-a4d9-07b8e8c1d58f', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '56d60aed-c2a5-467d-bf4e-901e7988c061'),
('3908c915-1882-48be-9323-efb95c916669', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5df715b7-0cce-4d04-b2b4-8496b1b43efd'),
('39372260-bcc4-4879-b9be-69ea4c54ef14', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6ea28f74-8857-4a16-9744-502d119788ad'),
('397ff0b0-c280-4c9d-9d84-852eb8b3b050', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bca555ac-a6d5-4acf-ae2f-a3fcc1dca6b7'),
('39eb3b0e-c0c5-4c21-a2cd-c41817949d47', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'db97c5ba-deae-4a1b-b19e-18e1788522ac'),
('3a89ae78-a977-4915-a74e-360b8f3a0818', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '45555431-6d78-4c52-a4d1-27d124cd2ede'),
('3af85581-cdb0-4c7c-b961-0af347f25dfd', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '99cea1b5-8dbc-41a6-9eea-762172180311'),
('3b44a0e1-2293-475f-be6c-c2d391149da8', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4730b05a-a758-485c-94d8-b5500da8aeea'),
('3cac61bd-91ff-4ee4-a1b9-430217e55f35', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8ea61ee4-c4d5-4f0e-b8a2-47d8d2cc9102'),
('3cca71c4-50d6-4ba6-b4f7-ac41607beab5', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '028854c0-0be3-44eb-a19a-76cf80aba423'),
('3e188b0b-1502-43d5-9dfa-3e54af0d15b8', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4c3f7989-342a-4911-9251-19feb2a3a2ec'),
('3e9b0a80-cc6f-4697-aa84-0a1c3d7a48ba', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '536367fb-a04d-4773-a05d-a6cc63aa8b95'),
('3f1caeb2-af85-47d0-9fd1-c42b7caffe9a', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bf3298b9-e7e5-4b0b-a4c7-638abdebaffc'),
('3f6f7023-a70e-45a3-8fd2-76382e8fa9a6', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4a5df41b-3def-4737-900e-a3c67acd6fdd'),
('3f7ae941-b7d7-4be9-bfcc-c1f9aec40d5b', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8a6a57bb-1076-4add-905a-7f4001e065c4'),
('3fade736-c46c-43b9-9746-732ae1455945', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5a34f7c9-48cc-48a1-b52c-58ed7d64deaa'),
('40c3f3a4-de93-428a-90ce-845c56d46ad7', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1c7781d2-c685-4fd9-844b-03a2c59e4115'),
('40e64439-2a9d-4236-ac32-8abc23e0b9db', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '215fbe58-672d-4979-a70c-b2e91587a333'),
('40ec2abb-0aac-4a64-b524-40946341c79e', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a3dc12d8-4141-4119-8e34-a0789a8f6ccf'),
('41ce1a98-b523-48ce-bd26-cdb26836d8e6', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '230ba947-8061-4945-8d3a-0e64303897e6'),
('443bfe1a-2daf-4cf8-af66-15ba4ee35da5', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3354613a-5ad9-4a68-80a5-86901da3a5b1'),
('479ceb31-2c73-4129-aa9f-731eb0defee3', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f44b6ba9-9884-4934-bcc5-b8ed74a7dbc2'),
('4a8a530b-51c3-49fa-827c-feb81d599bda', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3a877efc-55b7-477c-a19e-43c97f8f3073'),
('4c7d21c0-9e90-4e3a-91b6-bdc8d944d2d7', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '9bed1513-ef54-42b1-a2dd-1634e8bfd063'),
('4ca6e4d8-a636-4431-83f1-8441104907fa', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'cd27c3ca-d9ff-4607-85df-051fa820f90f'),
('4cb6ee4a-af78-47f7-8a49-4c9c17a516ae', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1e458832-aece-4d36-9ce7-5cce4d5633ef'),
('4d00d206-1efe-4c9a-abb5-e58cee581723', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'd917e5cf-aa68-4c7e-ad51-8a24cb5d403b'),
('4d684e88-7e7b-4324-bd4f-fd752cdb1e76', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0c732784-65d5-48cb-821f-396be2987eb1'),
('4d93221d-58cd-4564-b6d5-49d90b738dcb', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5ba0f6cd-804a-42b1-8f4f-481e80e6c65f'),
('4deaef37-d999-462a-a9a7-f3bbfaf0c61e', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e64ab048-5062-4c42-86a1-cc8bd9e5e23f'),
('4e2eb9aa-6f53-4db2-b5d7-662960cd9f87', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fb764a31-c5c6-4a7e-8edc-7f92395d1e56'),
('4e405ce8-6696-4336-b0d7-4dfce0049f03', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b3f5e9ab-7246-4dcc-9f47-d629b5c1faf9'),
('4ed88c7d-9254-4e67-8013-d99f5f7ee50c', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '22cbeeaf-b250-4bfa-9544-86b6951399a1'),
('4f19ded9-b049-4ba3-8381-f23c17c13f77', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c3cde8f7-6215-47ce-88a2-5958d61ac102'),
('4f4816df-e1ad-4373-8da0-86125acc976a', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fcddf814-5d13-493e-beac-4414f471a9ab'),
('4f65fa6a-91a9-4046-b461-eb96f3914134', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0186b0f0-faed-4456-87f4-a0bb172d3435'),
('4fb6512c-f853-4e7e-a4ea-e1275900fd73', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '56f4c3c8-91be-4135-a32c-49970bdeedda'),
('515114fc-7b95-41b2-a63a-d5dd63936c1c', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '35b6cb46-c403-4c4a-b6d5-5b208720f0c6'),
('518deb6a-4dfa-4c47-b34d-06fa3d4e1e58', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '95e8c3fb-d09d-41da-bf1c-96a308a0d85a'),
('529cf38a-df51-45b3-a744-935336efd5c2', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '27e3acab-a559-4848-a072-5a622f90a033'),
('534382d5-b888-4e52-aac4-34d8abcc21d8', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c6517000-2579-4182-9ab3-065a0ed318c0'),
('53645bad-b53a-45a6-98f2-fa7c50bd746a', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e243d3cb-df05-454a-b228-9619586a4b2b'),
('5402a0c5-23bf-4c7a-96b7-33512970e538', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', '467cd488-3ffc-4e82-b59b-77776910ec88'),
('5410b256-fdf4-4cd3-8c93-368c73d63923', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bf4f2373-144a-4eb9-b601-5cdebd2a2ab4'),
('544e2008-cf46-41ab-986f-d76509fe28f4', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a94d70dc-dc91-40bd-b7d3-bf0e1ffa3ef6'),
('5492ed5d-d866-42a0-96a8-93fefe8996ee', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bff7ebbe-44f4-437e-a0a8-06d22c577ce3'),
('554d6a8b-3fd3-4271-9446-111cd1c04045', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2b212e93-6e00-4072-99fe-03329f1a4ee8'),
('56384f39-f3fc-4a2d-adcb-1fc761a89de0', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1ac5335a-bbd6-48c7-ae70-04b008234c8e'),
('56c27552-bb97-4f6e-a98a-ee7aff77973d', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '343c0a2d-dccd-47b5-bdb9-fae5ac20f6cd'),
('57bbd31b-2b99-42f0-b015-01eb7e7f78f6', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '36cbc62a-ae07-4b8a-974c-b843f9fe6bd0'),
('59085b29-1b49-46d0-8e5b-cfe9b17cde81', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c72d8ce9-a910-4edd-9304-2339e266663d'),
('59735f39-3020-44a8-8f28-234a2eaf040b', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '11c5cb2f-1ab8-40a9-962f-d23c5dd5fc29'),
('5a26517b-e7f8-40e5-8966-4b895b89cc5d', 'DROPPED', '2026-05-03 07:32:43', NULL, '2026-05-03 07:32:43', '2026-05-03 07:37:09', '14ef0337-9de9-4f2d-9938-e65401a9afb3', '67d640be-41df-4f76-9ce8-fc35b00e7575'),
('5c832b57-bd31-4579-9809-7812e0ad2dc8', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ea533752-15c9-488f-be3e-58f7cec2e5c9'),
('5cbc391d-523e-453e-b3cc-914396db0359', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8d2ee3ca-d2a3-40a3-8c24-c6d602718880'),
('5d005067-2b61-462c-9415-8cf08175be15', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5096e05a-228e-46d9-8a50-fad542461afc'),
('5d7dfec7-4ec7-475e-915c-d05149451fd0', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', '86184ae4-a727-4c04-b455-ab7711370151'),
('5d8e399e-fc58-48a3-992b-a1705f030978', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3bd65c66-1750-4b55-848b-0e72fc2a7c2f'),
('5ed4562c-bf42-4915-b2cb-4d67405195e5', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3f896c86-ca34-485d-9cb2-6c861a2a74e4'),
('603edd73-1324-4143-99bf-5c7c972c0f8c', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1eecc2fd-7167-4a00-b228-e0f7c29ed424'),
('60c252ea-5170-415b-8b13-b4ced98ed01a', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a75a064a-c00e-435f-a2e5-bfb185671494'),
('6137ca7a-98d9-47b5-a951-109311fc504c', 'ONBOARDED', '2026-05-02 12:01:09', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:09', '2026-05-02 12:01:09', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'edd8d051-f2d9-4af4-aeda-ef4858ec9e7a'),
('621cf77f-e447-40f2-9423-86eee357fd64', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '807fc3a4-d890-480d-b62d-3de50e9fdb56'),
('63163e79-78c5-44ef-984e-a672114b5190', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ecf42fac-c692-4b6a-9cc8-385a969f5b98'),
('63bc4c94-a3e0-44d3-8ecd-c2f6bf98645e', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '74a27ecb-0f3c-461b-a0ec-c2f6d06eeefa'),
('63ec89d4-6791-414c-9b77-bc59ba14e183', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fc5ca1b9-9974-4c9b-8e13-412416831a7d'),
('6458392f-c2fb-4221-9849-517a900c2859', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f4092a9c-0ac1-4e2f-8299-2ebe6d93b827'),
('64d30d23-8047-49f0-a53a-fb8ccd1c4fa9', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'cb557657-eb5b-476b-bfe0-0ed3d39a33a6'),
('65981424-150c-4118-a3a1-413c810184dc', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b1188f54-597b-4f83-8b2a-7333165bab2d'),
('65abdb14-06ac-4987-b8b7-69702660f938', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4f584135-f6d7-4408-a6de-b57474470951'),
('670c78d2-cdad-4b10-a0a0-774acb393339', 'ONBOARDED', '2026-05-02 12:01:09', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:09', '2026-05-02 12:01:09', 'df105448-182c-4e08-985d-e73b0a0a07a3', '568f98a3-3656-45c9-82cb-b079abe0febb'),
('67181283-f9e0-4e37-8791-1f28605b66e5', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a9b08bbd-de63-48f0-b931-8f679df0afb8'),
('67358df0-2a46-4965-a652-a053d5d77405', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0507e6bc-5db8-47d0-9ba0-faa6f582c945'),
('676e210b-da52-4935-869d-f234a7f5b062', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bf27dd9a-6e71-4fcf-8c96-85ca868e1128'),
('6802e951-3de6-4bec-a999-2124c4e8a384', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', '05bf095a-5fc0-4a10-a5c6-a3b35fb45880'),
('697fecb3-2206-4f06-930d-1b41ce3c5480', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'dfe21d1b-7561-404b-99b2-f0203c940eeb'),
('6ab0727f-dff9-4aad-8a6a-937293501d3a', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6a3e7cd7-cd71-441a-ab03-e679fa6d2789'),
('6aefb82f-0bd6-4611-bfbf-1cfed92957a8', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '9be92367-bded-4667-b719-31174f95eb6a'),
('6c1935b7-fdfb-4fcc-8025-b4b471357028', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '431d5c0a-40fb-42a5-a4dd-20a072a6509c'),
('6c690d54-346d-4223-9f50-49fdd2dc069f', 'ONBOARDED', '2026-05-02 12:01:09', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:09', '2026-05-02 12:01:09', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2b618397-394c-4d50-84ce-9a2b54ab0197'),
('6c6edb81-cf6e-42be-82c0-29c11aed07ff', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', '30260896-fabd-48cc-9c04-f600987f1f23'),
('6cb699b1-0fc8-435a-ba32-032b4c5f885f', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a4ffa118-83e7-4916-b43e-328378e121a3'),
('6cfe28a1-1fdf-4929-8c87-59805d6f7dd4', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c6ec43c3-361f-472d-87f2-44fe45d6fb1d'),
('6d8408ef-5f55-40cc-b4f3-76b05c7212c9', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fdd3db07-5879-4ed3-a130-8d73da2cf181'),
('6e779bd8-af25-4175-b3a1-c7a9107473f7', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e49794e2-dd15-4da1-8420-f9f50920e75f'),
('6ebc9861-c53d-465a-ac7a-511548e44125', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '511eea69-4e02-4c5d-81e9-e9c2920a6141'),
('6fc24891-5c27-4f0e-a7e4-db0b5ec4d10a', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0bce7eec-4ac9-4ccc-8186-6ff89fac3b4c'),
('70441013-367a-4fcb-b546-c60e1531cf5e', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6b492ce6-5143-4647-8c48-044705cbc2da'),
('71205af9-f4fa-4529-a89f-4a0c22e6a939', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1d90cd89-26db-4937-b843-12f9e91d9673'),
('7322f474-5585-4ce4-9e8e-bbd2bc91f7eb', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ca2f6e5d-4ef7-4529-a9dd-ccd3b74846f1'),
('732c91ae-2739-4b40-ac29-4c6069524e4b', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bde27659-e5a9-4907-a2a8-cc13c6da6fa0'),
('7343ef1c-5c13-4c96-a260-919fc4435db1', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f46e2ec3-153f-4123-9cfd-40bb41b31bcf'),
('757dde54-39d4-4931-a9fb-fd746dd1d880', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '39e84890-933b-4035-9795-b74422b3b743'),
('75df6bf2-b6f9-48eb-9838-ee632b8ea87b', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c073744c-8862-42ab-a604-13071c5b9575'),
('7639bc16-0ac7-4286-96c1-3240f2d9d0d4', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '83c631a1-61b0-4588-8f04-e485c6b0c42d'),
('76c30494-8faa-488c-b0b7-3dec80a536f8', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f5759539-5d30-4ba0-abf2-825102c2198e'),
('7765d220-905c-4ffc-a4e6-8488feb8c3e5', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'de473ae9-e128-4238-b572-7d1e7b255c3e'),
('776f6392-02ec-472a-90f4-9d68c6942930', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c9615ed6-3214-4cfb-bb06-941170a45e09'),
('79c67a66-46a2-4214-9f3e-40dd5f7bc5c5', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '271689e9-e6a9-4fc3-9359-4340e0e255d2'),
('7c982f39-3d72-4297-8f65-0f72f8d53bd2', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1883750a-8489-410b-b932-e87c9827de96'),
('7cdf0616-ef9b-4227-a8cb-2cb0bbd91f51', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', '51a48d29-9d1a-4bb8-b212-65e0b878185c'),
('7d6d05b9-72fe-4832-86da-e3bf726761c2', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '180f3caf-001a-4c31-9536-62f3695530c8'),
('7d864913-3900-435d-a68f-19a6caf104ad', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '613d6a72-6d65-4dc4-bd8b-5df92790c046'),
('7e8e7566-a580-41eb-ae8f-05ce938b6a2a', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '841b8d2f-f763-4d1f-9c2f-6749a97d0b6d'),
('80dab95a-c79b-4fa0-be7c-0ab1f0df9f9a', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e768f5f2-1bcf-4cd1-ae9a-468c00a94768'),
('824e71d3-5d79-4d17-a088-14669d277536', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b0f2ff15-0bfd-4a41-9028-3fab081d091a'),
('825e377c-9553-4500-9172-b98428a73ad6', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5a2960cb-3433-43db-88be-8c35f08f65b6'),
('833224cd-6f7e-449f-b90d-c9b49b7b065c', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3aebba36-e922-4e6b-8d75-63a8f834a04e'),
('85c49b8a-d757-4b67-aa90-04c4c18782b8', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8f09f314-472c-4d5f-9cbc-e2668166c8f2'),
('862ed6ad-6c6c-480f-a0dd-f951f9ae0c96', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a06346af-512f-4e2d-882a-942339eb1da9'),
('864de1f1-567e-4b52-8f6a-227cc0651aac', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b3341a73-f42f-41a4-8a28-62ea2c656805'),
('8759624f-0b98-43e8-a42a-709a728e73e0', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b360f3cb-e549-464a-b585-4a65b0dbce4f'),
('88237422-41b4-4154-8a13-21f0150c4a0b', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '692fb54b-f287-4628-9af4-f890a6952c48'),
('8915f66e-cd90-4c3e-8b20-55b546a6fdc4', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '99b18f1d-cec5-4300-aa2b-ba88971dffaa'),
('8939fdc1-7ba4-4fb2-b3f2-ab7a418f51a4', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ed4f8518-3dda-4761-8452-ea80570b85b0'),
('89cbb1b0-fa5d-4235-b4d5-c57c0641ee86', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2fddf62b-eb9e-4a95-8ced-443f80555a22'),
('89ff07c6-5ef7-4542-8aaa-e9b2109f513f', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '9254b05f-ab99-425e-b8a8-f5290e46dad4'),
('8b4737b0-91fd-4c84-b159-4d383c8ebba0', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a40e0e94-6663-4654-90fe-4bb4190ac922'),
('8bcc907d-df06-4327-9ce9-ce092d509382', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e6e82f84-d6f0-484a-b196-2e4d01ee32e4'),
('8be3f610-e50b-44ae-a2b8-d7af01737ed6', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3bae765d-fd48-4837-a364-2ac3c3f349b0'),
('8da68356-fccf-4571-8447-772686e7b25b', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '53456d41-81da-4966-9a7a-a7603ace187d'),
('8e711ff8-b200-4bbb-8329-4435e9785fb8', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'faf20bd6-57d3-4aa8-b45b-d050ad6f859d'),
('8eb6e0b7-273d-4314-943d-0c3b5ff15550', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2937ef63-a9ff-4fdd-a0e2-b62e87062b87'),
('9089d19e-ad13-4d34-b910-7ba13b001d43', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5a4843c6-4ef3-485a-a022-e9a9107db69e'),
('90f6c704-fe30-47da-a322-05751ac49884', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'd66b6189-0ace-49ff-85c5-ebc5736560fa'),
('913cd789-1a99-41c0-9e51-33af08da9753', 'ONBOARDED', '2026-05-02 12:01:08', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:08', '2026-05-02 12:01:08', 'df105448-182c-4e08-985d-e73b0a0a07a3', '900b6fb2-e61b-4b7f-937c-e186a739f336'),
('93b56eb2-218c-45f3-8062-b76f73092ecb', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '84bdb54c-ca7b-497d-af72-797de824bafa'),
('93d6eba9-da3c-464e-ad53-c1307d85383d', 'ONBOARDED', '2026-05-02 12:01:09', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:09', '2026-05-02 12:01:09', 'df105448-182c-4e08-985d-e73b0a0a07a3', '87d4c22c-5cbb-4a50-b7a8-2b15fd147d8c'),
('94baa978-84aa-4d0e-b0b4-e7eb0fe700a5', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bb2eb144-88e3-47d0-9035-7eab2579b801'),
('958fd8d2-5c31-406b-8012-bf84c98f6f3d', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '43afab98-d7c4-49de-8b0a-58e9f3228770'),
('95e21377-8e1a-442c-81db-66aea5ba70f4', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '9e54f251-337a-4744-8532-d8b9414eccfe'),
('96bb57cb-f00c-419c-9c6f-31256c142708', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '00f0e250-f6d4-4f9e-ba2c-02f7e209fd2b'),
('97e81c64-f158-431a-aa01-4c9f89d3365f', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'dbcd064a-6b21-421e-a980-047d9291995e'),
('989a1bb8-5385-401a-a6bb-6ecf5aeec6a1', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '88519ce7-2a4a-4830-8e62-99d2b1b34262'),
('9b19fc36-a88e-437b-b24a-bb659833cd4b', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2f8095f6-8868-48f3-adbf-b41a51943aa6'),
('9c568ac4-cec8-48c8-8326-e4a4508c2b34', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2cdafb55-4729-49fe-932d-359d9a0981a8'),
('9d01b601-aec6-420e-ba49-5ba8cd7caf1b', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '81845405-1ed3-4bc4-8940-2ce7c7541d6c'),
('9e9c8acd-d5db-47e0-bc1f-ce33a7e1c4c4', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ed600f10-ce68-4338-b2a2-1543ca51e593'),
('9f0658e5-9bc0-439e-9907-1498cbffb420', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8af8fd90-2fef-4b1c-ab69-65e34017f8a7'),
('9ffdf116-2185-4e6f-aebd-07fc06e0a3f9', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e2d6d163-2ea3-4cc9-a880-2be634fae7a9'),
('a15c9414-a74d-466f-94f9-fa35fe80d5b7', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ccb45f08-32fb-4b13-8871-4693025884aa'),
('a270e350-79e0-485a-80dc-2eca68f88649', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fd294e27-3498-4cea-ad02-fb4cd672a034'),
('a2ec7694-253c-422c-8d47-49631618db3a', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '067db325-b04d-47bd-8c17-b90480ca2b48'),
('a330affa-7f67-42ff-b18a-8b6d73e4bbdc', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fb3cdd26-4da6-44cd-877e-243c7cdd1597'),
('a3598044-a0ed-4048-8256-e4fda9e23adc', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6f448487-baaf-4dae-8a06-4498e79d9e46'),
('a55b7719-19f5-4a3e-9e88-94fda7dc2a74', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '07c99523-3c2e-4bc6-9748-f58bd3e7a794'),
('a57b4e98-5c83-4944-8cc2-2479e50cf4e4', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4c2004c7-4efc-4ff2-90d7-7313ad2ec5e1'),
('a5828ba3-87a3-4c77-abc6-9ca8647651f5', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '00b4743c-9b18-4057-98ee-d24ec51eca7a'),
('a5b56831-3d03-4f39-b3b9-32ed05f71cd0', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5acaf073-fb7f-4ab3-b3d2-a6621ac05873'),
('a61d888e-d504-48d8-8765-19ba321f7011', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f85d64e2-e573-4482-9258-35ada113e48a');
INSERT INTO `student_sessions` (`id`, `status`, `enrollment_date`, `onboarded_by`, `created_at`, `updated_at`, `academic_session_id`, `user_id`) VALUES
('a661c3ee-b09a-43e2-b6cc-dc7814b49ed1', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b8346b37-674c-478f-8227-077160311fd4'),
('a6a47af7-5c05-4112-983b-6035b87c1672', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '7df00945-8607-4c4b-b3d1-379f11a13166'),
('a6f6f787-b99c-4bea-a2d8-36e5f28f1f17', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'da036d27-b166-4f88-8536-4609caa6ee18'),
('a717ae24-4c5d-40ed-9b41-4cb315903ea4', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a62230f7-e26d-4815-b0cd-62cbc2503d36'),
('a781e287-3c61-4944-8287-1ed6fd34522f', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8e96a792-8aeb-4b54-af68-e7d51622f5aa'),
('a8794516-98f4-46ff-8cdc-05d1ce4bf624', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2c0c1c19-1439-49de-a359-3a9f5b551438'),
('abafcb76-0a65-47ec-b3a0-c06c72a8c561', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '27a554a1-2a14-4281-bce5-ab4cfb5b3505'),
('abb18ac2-0cdf-4784-b099-02e87741bc87', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0147d2ed-2e09-4a8c-93f0-2b13dee5b8ba'),
('acb8ffaf-d722-4095-8e02-761703d34a94', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'de2777b4-4ac6-434b-bcae-d9a548f5f707'),
('ae61373e-dc18-4c25-ae07-7ecac2949db8', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'dc827f00-569f-4e62-9d68-a9a0e200164d'),
('ae689764-320d-4289-8cf6-d23b803e18c8', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'af9cb890-d215-4e08-a416-0236411277a9'),
('ae93bb52-7a32-4eec-acce-7716dbf608b8', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2bcf1680-d27b-4726-8ed2-eb47b2088b59'),
('aeb790d7-6e56-4c89-a5a3-37937fb5cf67', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e4545d75-ef48-476f-ba0f-7036da0c38b3'),
('af7bff46-868a-4a7a-acdc-618e2dd06473', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a465e258-1900-4455-a83e-d89727982259'),
('afef501f-35be-482c-a5d5-817a84e8a2f3', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '314a0bc5-5fa9-4870-ba1e-2ff30fb359c1'),
('b058e15d-4485-4bbc-b763-2cd8847bba60', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2a323008-9cb2-44ce-a87f-55e3ce22cfc7'),
('b0726812-b141-4f6f-bf0b-5b201d64d2dc', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0107e0c3-54c9-4299-a40f-05f29c30e072'),
('b0e182af-1219-452d-aef7-5f89c632f6fe', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', '77c3aa27-aace-4c00-8c5d-132e7bf22003'),
('b10d596c-5b94-4e4c-a6a0-b9ecfa9cf3b7', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5d188cc2-e12c-4fac-8285-f92a09da0b53'),
('b28ed9fb-bf09-4fcf-a186-b084182c0aad', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '569534f3-7a4f-43ae-b98e-5ce1e5d9769f'),
('b2e7fb03-a703-4767-a565-51b91195d2ee', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '7b7a2a2f-4056-4b73-bfd4-1c526a434cc1'),
('b3e30b06-a7a8-45de-a418-ef0bbebb80ac', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '2f15b5b2-d764-45b2-b8c4-4d11a0abf6b1'),
('b45a25dd-1f6c-4f86-a7a9-84dad97a7b49', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e0ab1007-377b-4931-9aa2-4b8d4a582c68'),
('b523833d-1dcc-4d3c-884d-079ac89e052d', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f497b1a6-7427-45d5-a8f6-e170f660d066'),
('b5875b8a-0d15-4109-a1b8-bbe764e55125', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'fd8b77d0-ec81-40ce-9d8a-d733b30fc9f3'),
('b5fe56fe-0948-4884-80ea-f06041125e49', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1c68543d-b464-4c91-ad6b-6d69034eb206'),
('b610f484-93e4-4e1e-87dc-525598337c8c', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ca1a9326-1180-4b00-86d6-3cd3facd9165'),
('b6304b3e-41ab-457e-b9ca-bd52ae06b3a2', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'f11e5488-f04d-43ae-9b50-3ef3deee9914'),
('b6403b0a-20bd-4895-9a81-2dbb7bac8c2e', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b5bcce32-053e-4c8b-9ff1-b3b91d7ce6d2'),
('b691d38a-8e78-4c88-b97e-e7971053a5cc', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', '62e7bef4-6ebe-414e-a882-4a2c2215f5e9'),
('b6ce5821-084a-4940-9175-1a57be3032ab', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ac6c0738-861b-419c-bfa7-9b6880258ad3'),
('bbad5508-101b-4e7f-80ee-11315391e694', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '58152982-6c24-4e5d-8e41-27fe9e9ee315'),
('be9e1907-a613-4e03-9531-64fba08c5bdd', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5c9bb05d-02c2-4b6e-87bf-67c23cd5e905'),
('bebc01b7-fcc3-43e1-8dc0-d8b0f3988101', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3ae0ac3d-c093-4aca-a868-af19571c80ea'),
('bf09f72c-b829-4072-ae82-5137143d6930', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '94652bdd-4789-48f1-a37c-fca77703bdfc'),
('bf641b05-c1ba-4da1-a666-68d1ad2a198b', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '240dc0d1-c8c5-495f-a62a-33ee5610b650'),
('c0604976-b9b6-4a6a-bfc4-be761a057092', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', '0ef670f2-7987-4961-85f8-c65b9377b02f'),
('c0ba6252-4842-4fac-a5f0-ffd963f42fcd', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'cd7f2f5a-0bae-4535-bfc2-30fdce97cf85'),
('c16f76eb-07d6-4a4d-9e44-51da4bed65e1', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '34b18ead-15f2-4f6a-9564-662813d471b1'),
('c2a5a574-d9b5-4f59-8e91-c5cb374b49de', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '777d6ea8-10ad-4795-8f37-798f4400fd11'),
('c3370435-95c5-45e0-9a26-ce0b68befe12', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a2775b55-1e37-41b9-92b7-e0641823f076'),
('c340a51e-cb3f-4216-8077-9a971cb873d2', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'accdcec4-7146-41b9-b1ff-75923fdd7f37'),
('c3bba044-01ef-4aa8-8694-08bb12f5aaa3', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '205fe399-dc9c-4387-aae0-cba28d0d273f'),
('c4388be5-8e62-4d9a-ab1b-65924759b2bc', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '7f1c52ee-4278-49c6-b3a9-8e4f0d03530a'),
('c657c6ae-89fb-4c2e-a63e-ab5cebdfc528', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '8b8e749b-6797-4d74-8cf9-f1bb092b11a9'),
('c6b7ec9b-0942-4a72-95f5-e2bfa08186f9', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3117c295-98ef-4e61-8bc8-f06175d1ea39'),
('c9ca6038-276e-4e25-9692-0938f4d3879a', 'ONBOARDED', '2026-05-02 12:01:06', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:06', '2026-05-02 12:01:06', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'ad0124b8-01d5-4b21-8266-f777b4978060'),
('caa9f6f9-54ca-4666-ada8-1089ab734bf8', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '029c145a-a901-4d44-8ff0-22edfc2a51a6'),
('cbccfd57-13e7-46ec-bf27-63783b3fb523', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '12306948-a632-47e8-bce8-1b2f4c0df801'),
('cbcf528b-374a-41a1-9871-99d9426a8ce9', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b5577021-6324-4e26-b4c2-db991f97b22a'),
('d06d2f9e-d847-4bd4-8391-cb918d321e6c', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3efe5a7e-33ca-4177-9527-df863a0cdead'),
('d0d7f777-4b33-48c8-bc82-4f1c0ddccb5b', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a3cfd764-98f1-491c-b61b-9dc01c6658fa'),
('d323f807-40dd-4414-bbba-3dd5cd8b890f', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c21d3853-a324-4d5a-9350-1050716d97ea'),
('d35b2382-51ba-4bfa-b966-2c8a10faef10', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6f3fe346-ea19-4c25-8969-c8e2bada6b34'),
('d4424296-05fc-4cb5-91c8-7c3256baac77', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', '23384a33-e924-4a35-8d83-61c5a3a807cb'),
('d756a66c-022d-4778-9078-70322b0bb52a', 'ONBOARDED', '2026-05-02 12:00:45', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:45', '2026-05-02 12:00:45', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c99f8bf6-e7fc-4d33-9328-07831ecfd019'),
('d7601764-93c9-4761-b93e-bbbb1bc2faf5', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e6b58b53-3a1a-47f3-9c7e-fc868a82d67a'),
('d7c31714-d8ef-47b2-abe7-3bd1e2730121', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '322b1c1a-ca04-4c8d-8149-af95b91dfd51'),
('d9ed6a24-42f9-453e-907b-25beb3c782ac', 'ONBOARDED', '2026-05-02 12:01:03', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:03', '2026-05-02 12:01:03', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'e34e672e-bbd4-4594-b724-197647974039'),
('da007a17-7464-4bc0-9269-0cc7ab947c8d', 'ONBOARDED', '2026-05-02 12:00:55', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:55', '2026-05-02 12:00:55', 'df105448-182c-4e08-985d-e73b0a0a07a3', '073c7ebd-168a-406e-8a69-825325aa7685'),
('db3cc4d3-79ac-414f-babc-fc669847c22b', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4dd2b3b1-69e7-4d87-991b-0f4fe378f85d'),
('df9a85ba-995c-4518-ac19-6df2c66ba289', 'ONBOARDED', '2026-05-02 12:00:51', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:51', '2026-05-02 12:00:51', 'df105448-182c-4e08-985d-e73b0a0a07a3', '4efaf98c-42ad-4561-9291-c3bb6c64c134'),
('e0b65c86-be9f-4f2c-a35e-69049a95c78d', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '30507dfe-192e-4c31-a6d0-924f0e4935d0'),
('e27050b5-9afc-4d73-aff2-d46ba37e4a21', 'ONBOARDED', '2026-05-02 12:00:49', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:49', '2026-05-02 12:00:49', 'df105448-182c-4e08-985d-e73b0a0a07a3', '9f8783e5-8cc5-40e2-bcae-54561ff24f8b'),
('e3900396-aa89-4588-a31f-b6a64a680fae', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', '31358d0a-77f1-4682-a2f8-ef8d2e2186f3'),
('e390b919-0640-409c-b056-e0d771a4f70b', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '774c62a9-b3eb-4ae0-ac00-7c8cfabe5553'),
('e3f7e37d-e60f-4aa0-8f05-1662a285ca6a', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b61c12bf-abfb-4dad-b652-7b3bbdb3d013'),
('e44839b6-7486-40ac-ae7e-3c29cd838126', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '75130a59-f246-4c85-b91c-5d7ea885ee13'),
('e4bbaea8-3f92-4b26-a3dd-4828141f9ed6', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'd48823f9-2a06-4a2e-8f7e-475c4f64bf6d'),
('e4ed4f2d-c90b-47b6-8075-d39321e616ca', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '6de63f0e-dd22-4bcc-8273-ccad38082244'),
('e56b9740-0ec2-4ebd-a604-b6b9d13978d7', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '538a05d0-acca-443e-a8f9-62131f7f8bb9'),
('e5961e21-af5a-4c73-ae4a-27f28243203c', 'ONBOARDED', '2026-05-02 12:00:56', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:56', '2026-05-02 12:00:56', 'df105448-182c-4e08-985d-e73b0a0a07a3', '16feba10-9e74-4f7d-9025-ec86fd56f770'),
('e5bc228f-a63c-4a1a-874d-ee440a6ff11c', 'ONBOARDED', '2026-05-02 12:01:02', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:02', '2026-05-02 12:01:02', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'de61c4ae-9c1d-45e9-b4a8-2cceace942de'),
('e6e050d1-f1eb-4771-9cfe-4e20e70680a9', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '25f9cdd7-8a63-40c1-992f-542ace7da24c'),
('e773770b-e23e-40d5-948a-7cda38a9870f', 'ONBOARDED', '2026-05-02 12:01:07', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:07', '2026-05-02 12:01:07', 'df105448-182c-4e08-985d-e73b0a0a07a3', '756550e7-028c-4cee-9a91-882eb3b02d75'),
('e7c286a5-bfaf-4e36-9e61-b80d09f4e198', 'ONBOARDED', '2026-05-02 12:01:00', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:00', '2026-05-02 12:01:00', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b6b26d3d-6d53-49b6-879c-f1f8f22a5dbf'),
('e842749a-1590-4819-92d6-74b27a241c94', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', '727d5903-f816-4d6f-a629-01fa07c06dae'),
('e88e31fb-f6d2-4ffa-89e3-467fa311aaab', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c25aa6dc-3a34-4c86-8501-2f661551bb12'),
('e991bbf5-b660-4e88-ba63-e6a6dae099a0', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'cb28688a-6991-4209-96d3-3b4aa4518319'),
('e99c2f5a-9691-456b-8ca1-8febb0ce8db5', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'a35dd8be-bc69-4621-88d7-89465a5c06ec'),
('ea918946-bd12-4a57-a7f6-f43ac90cb383', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1d93b8c9-e0e3-4e18-8e70-522ce8605b10'),
('eab465eb-6899-4fcc-af3f-93ff71523ccb', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '35aa01fd-6b11-4431-a275-155ce4257413'),
('eaf6f540-7850-47a3-b330-d1c53ec80200', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'b1bc4023-c0df-43ad-a4fe-3d4c9d09891d'),
('ec769af1-6839-4b82-9c07-6751a6013e40', 'ONBOARDED', '2026-05-02 12:01:05', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:05', '2026-05-02 12:01:05', 'df105448-182c-4e08-985d-e73b0a0a07a3', '76a587ad-c6c3-4aed-8966-4424949985ac'),
('eec0ac17-fda5-49dd-a69c-23ed4d8a5bd3', 'ONBOARDED', '2026-05-02 12:00:50', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:50', '2026-05-02 12:00:50', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'c205a33b-a7f5-4597-b557-7195015d8719'),
('f05ac0e3-67c7-4d55-b328-1441d88ba93b', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'afa6e0a5-d26b-4e95-8414-25c350ed587c'),
('f05b64c1-f5fd-471a-8d9c-37381ad64ebb', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '44f37800-8dd0-403a-b1c2-252428efbf20'),
('f0a44b33-7df8-44df-939d-40d49e02501e', 'ONBOARDED', '2026-05-02 12:00:54', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:54', '2026-05-02 12:00:54', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1767cc16-2a17-453a-899e-6ea0dc1bb9bb'),
('f3e4c96c-e115-4692-aebc-6cdfeb1d1e46', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '03d3d82e-8558-457a-9e27-527de647755d'),
('f4096fa7-7893-4fc6-8488-4fb37cef514a', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '346ea0c4-9cb7-44f3-a0c3-f092b0693313'),
('f43e5f11-4d52-4d07-88bb-5b62603507a5', 'ONBOARDED', '2026-05-02 12:00:57', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:57', '2026-05-02 12:00:57', 'df105448-182c-4e08-985d-e73b0a0a07a3', '194bed9c-c992-4605-ab8d-a5ce97efdda7'),
('f4720ea4-9722-4296-a591-d8e86784add6', 'ONBOARDED', '2026-05-02 12:00:59', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:59', '2026-05-02 12:00:59', 'df105448-182c-4e08-985d-e73b0a0a07a3', '03f6d7d4-73f0-409b-bf23-2ef3de8c6061'),
('f49c1893-b1b6-433a-b21b-c8214e0a0b40', 'ONBOARDED', '2026-05-02 12:01:10', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:10', '2026-05-02 12:01:10', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bd6c0734-e2bb-4ea7-8e00-33886f6db927'),
('f4e2f773-4e62-476e-a593-47fa2168ddbe', 'ONBOARDED', '2026-05-02 12:01:01', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:01', '2026-05-02 12:01:01', 'df105448-182c-4e08-985d-e73b0a0a07a3', '22894785-911a-4c6c-a327-cb16b3395694'),
('f53d5a91-d929-436d-af5c-10e6e6afa365', 'ONBOARDED', '2026-05-02 12:00:46', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:46', '2026-05-02 12:00:46', 'df105448-182c-4e08-985d-e73b0a0a07a3', '72b2de23-f16c-4f98-8fae-cde8706e094a'),
('f54df8d6-989f-48ac-ad0d-9940725a459f', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', '16ab6a64-8a38-4e83-9012-3999ffd10f5b'),
('f5ebead3-7df4-496a-a647-b8bd85720485', 'ONBOARDED', '2026-05-02 12:00:52', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:52', '2026-05-02 12:00:52', 'df105448-182c-4e08-985d-e73b0a0a07a3', '5998db59-f8a0-4ed0-b14b-1e49d73c0930'),
('f66645b0-a76d-45f6-a492-bb0c213f9e97', 'ONBOARDED', '2026-05-02 12:00:53', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:53', '2026-05-02 12:00:53', 'df105448-182c-4e08-985d-e73b0a0a07a3', '723e82c2-8976-4a42-8bcc-62fc87c3afcd'),
('f7b387de-dd7e-4c89-9a1d-e4965ddee88d', 'ONBOARDED', '2026-05-02 12:00:58', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:58', '2026-05-02 12:00:58', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'dadc2e5a-6a55-4e19-b306-04462c6dbbfc'),
('f925d5e7-c69b-4f7f-b01a-d2e30071e164', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', '1fe86b98-19eb-49e0-bee3-b19408ae4d5d'),
('f994cb7e-aa32-4f0e-9b8e-b5a098f9d0c9', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bea280f1-bbc4-4289-b878-c2ba0b8b445d'),
('fa2292e8-c363-4265-bf9e-ebadde82f974', 'ONBOARDED', '2026-05-02 12:00:47', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:47', '2026-05-02 12:00:47', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'dc321283-a7cb-41a1-ae49-2f9541af07db'),
('fa60b628-c19e-40d1-94f5-fb024867f9b1', 'ONBOARDED', '2026-05-02 12:01:04', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:01:04', '2026-05-02 12:01:04', 'df105448-182c-4e08-985d-e73b0a0a07a3', '086e88ee-c307-4001-a311-bc3e7d188876'),
('fa9023cc-3f96-4ee0-9e3c-8c50a3213540', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', 'bb40abff-9aca-4150-b647-116d4967a414'),
('fe905298-578f-4398-a66c-ac72c87b50af', 'ONBOARDED', '2026-05-02 12:00:48', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:00:48', '2026-05-02 12:00:48', 'df105448-182c-4e08-985d-e73b0a0a07a3', '3a102b28-30f2-4f3b-b363-fc440bd94803');

-- --------------------------------------------------------

--
-- Table structure for table `student_session_categories`
--

CREATE TABLE `student_session_categories` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `student_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assigned_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_session_categories`
--

INSERT INTO `student_session_categories` (`id`, `student_session_id`, `session_category_id`, `assigned_by`, `created_at`, `updated_at`) VALUES
('0fb5f1a6-aef7-4e87-b044-83f2c992d465', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', '9dbc9625-4c25-4854-9a53-f431045f6cc4', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:40:05', '2026-05-03 17:40:05'),
('10a4a057-2819-469b-91fd-05ca5ab9dcf7', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:41:07', '2026-05-03 17:41:07'),
('20201c0d-f47c-4573-9b87-092acd68c529', 'b0e182af-1219-452d-aef7-5f89c632f6fe', '81ff337c-c833-4aaa-95d5-575263414da7', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:18:08', '2026-05-02 12:18:08'),
('20a3e5b7-72c0-4651-b2d2-9edb80b394e4', '035833a1-b2d5-4589-a76f-8fc2e4b5c9bf', 'b55d5c46-c0e6-4485-bb95-37ce0db860e0', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:34:00', '2026-05-04 04:34:00'),
('227329cd-46ad-49a3-a192-8b692cbf115b', '862ed6ad-6c6c-480f-a0dd-f951f9ae0c96', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:39:21', '2026-05-03 17:39:21'),
('2ab0b590-435a-4d30-b73c-0ec6a959e47b', '3908c915-1882-48be-9323-efb95c916669', '8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 12:32:33', '2026-05-06 12:32:33'),
('3703cffd-df90-4a58-8b6d-493eda1d4501', 'c16f76eb-07d6-4a4d-9e44-51da4bed65e1', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:39:21', '2026-05-03 17:39:21'),
('413ff5f5-6a48-41b6-85c0-d92c171321c0', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', 'b55d5c46-c0e6-4485-bb95-37ce0db860e0', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:34:00', '2026-05-04 04:34:00'),
('452edd50-f744-4336-875c-b6d6cd27a424', '57bbd31b-2b99-42f0-b015-01eb7e7f78f6', '9dbc9625-4c25-4854-9a53-f431045f6cc4', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:40:05', '2026-05-03 17:40:05'),
('4e2360be-80d2-4bf7-9953-b17319c47e76', '57bbd31b-2b99-42f0-b015-01eb7e7f78f6', 'b55d5c46-c0e6-4485-bb95-37ce0db860e0', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-04 04:34:00', '2026-05-04 04:34:00'),
('6f202129-cf9d-4dfc-ab9b-561876edf02a', '57bbd31b-2b99-42f0-b015-01eb7e7f78f6', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:41:07', '2026-05-03 17:41:07'),
('7cc5c2b7-f48a-4a37-92d4-dbf44ad30576', '60c252ea-5170-415b-8b13-b4ced98ed01a', '8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 12:32:33', '2026-05-06 12:32:33'),
('846cffd9-766a-4864-84e2-fc289d428b90', '3908c915-1882-48be-9323-efb95c916669', '81ff337c-c833-4aaa-95d5-575263414da7', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-02 12:17:46', '2026-05-02 12:17:46'),
('8adf42e8-154f-4be6-a9ca-fb5784eb4819', 'f49c1893-b1b6-433a-b21b-c8214e0a0b40', '8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:33:38', '2026-05-06 11:33:38'),
('8cd55e33-b194-4e96-a45f-6d949e356c2c', '3908c915-1882-48be-9323-efb95c916669', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:41:07', '2026-05-03 17:41:07'),
('93afb845-f72d-4261-9550-b1c646c29043', '35ae8d77-e9e6-4cdb-9a8a-35974bbee16a', '8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:33:38', '2026-05-06 11:33:38'),
('a5e665c9-5855-4418-a7f8-dd0f42c74dae', '308b9f0d-4510-40fe-86ae-2ee1cbdcdfa9', '20af5eb8-8af0-44fe-910e-fd10e5684140', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb', '2026-05-03 07:41:08', '2026-05-03 07:41:08'),
('afe94039-b2e1-4d7e-9baf-9a6899383d02', '57bbd31b-2b99-42f0-b015-01eb7e7f78f6', '8a4795bd-e2ce-4ec2-8eda-5533030d7cbe', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-06 11:33:38', '2026-05-06 11:33:38'),
('b92f061a-a583-4ed4-bba4-4253c3bc6c99', '07706030-3106-4534-aa6e-0289f9fdbe82', '5a21e9a0-83b9-4f25-89e5-3e23cf9449be', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:39:21', '2026-05-03 17:39:21'),
('cdeb1c73-a744-4405-a2eb-f7677a393e51', '3908c915-1882-48be-9323-efb95c916669', '9dbc9625-4c25-4854-9a53-f431045f6cc4', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:40:05', '2026-05-03 17:40:05'),
('d9e0c366-3d93-4fce-8cff-3f2f0ec16248', '862ed6ad-6c6c-480f-a0dd-f951f9ae0c96', '9dbc9625-4c25-4854-9a53-f431045f6cc4', '0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', '2026-05-03 17:40:05', '2026-05-03 17:40:05');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `employee_id` varchar(255) DEFAULT NULL,
  `registration_number` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','ACTIVE','INACTIVE') DEFAULT 'PENDING',
  `requested_role` enum('ADMIN','HOD','FACULTY','COORDINATOR','PLACEMENT_COORDINATOR','TRAINER','STUDENT','MENTOR') NOT NULL,
  `approved_role` enum('ADMIN','HOD','FACULTY','COORDINATOR','PLACEMENT_COORDINATOR','TRAINER','STUDENT','MENTOR') DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_password_change` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` datetime DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `profile_image`, `department`, `employee_id`, `registration_number`, `status`, `requested_role`, `approved_role`, `last_login`, `last_password_change`, `is_verified`, `verification_token`, `reset_password_token`, `reset_password_expires`, `metadata`, `created_at`, `updated_at`) VALUES
('00b4743c-9b18-4057-98ee-d24ec51eca7a', 'sameekshachhetri9@gmail.com', '$2a$10$/ZXAV3aKOK/Vfp4lP4e0hec8c/HzgE90cohmJ2S7u0XSxLp25cQNi', 'Sameeksha Chhetri', NULL, NULL, NULL, NULL, NULL, '2520010403', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('00f0e250-f6d4-4f9e-ba2c-02f7e209fd2b', 'snarula770@gmail.com', '$2a$10$JX92O.g6wWQ/NzsdiRQC.e5iVuSkDYui2t4wYZ.FKdGGzTk8ENAIO', 'Sneha Narula', NULL, NULL, NULL, NULL, NULL, '2520010090', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('0107e0c3-54c9-4299-a40f-05f29c30e072', 'muskangaur139@gmail.com', '$2a$10$e2ObOMCvfJLZ50p14MIDLeBKj/5xos9/E.YV6q2j984UolpTPw0Y6', 'Muskan Gaur', NULL, NULL, NULL, NULL, NULL, '2520370004', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('0147d2ed-2e09-4a8c-93f0-2b13dee5b8ba', 'saakshi.agarwal05@gmail.com', '$2a$10$RHMqaZo14xIUNb90ZyEVne.6It29CDQGsf3tIwgKeqlzF.8pR6DzG', 'Saakshi Agarwal', NULL, NULL, NULL, NULL, NULL, '2520010095', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('0186b0f0-faed-4456-87f4-a0bb172d3435', 'maalvikakharayat@gmail.com', '$2a$10$k5hR99V2sMa6jaU2cROqS.4YkuSQ3sln6gNYiYkhFrfcTNKjLvPyK', 'Malvika Kharayat', NULL, NULL, NULL, NULL, NULL, '2520010105', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('01eb9224-f719-4cb7-aae1-2d961768d975', 'anushkagoyal1864@gmail.com', '$2a$10$n2gFXCEIh.lXIzmmtbqMPOTVkLsDIP2EZPix9N3H/y6I9Welkrlu.', 'Anushka Goyal', NULL, NULL, NULL, NULL, NULL, '2520010347', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('028854c0-0be3-44eb-a19a-76cf80aba423', 'pj23072002@gmail.com', '$2a$10$tZdGYmXuoC6ZKq4iLEtXHOC5cAfmcrlUPsS4hVzCglmPVNEBIpa.m', 'Priyanka joshi', NULL, NULL, NULL, NULL, NULL, '2520040002', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('029c145a-a901-4d44-8ff0-22edfc2a51a6', 'rudrakshabhatt090503@gmail.com', '$2a$10$JbAQVK/lXBwWUNenFgdrc.GsQrMRW7HTfP9kw3YYDEAH0LWuAtPQK', 'Rudraksha bhatt', NULL, NULL, NULL, NULL, NULL, '2520010398', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('03d3d82e-8558-457a-9e27-527de647755d', 'oberoikritik31@gmail.com', '$2a$10$YtwvAtz4v6CafKoIg2UJMu5343BKPL126LG35LNBaMGZGad33c4ru', 'Kritik Shrivansh Oberoi', NULL, NULL, NULL, NULL, NULL, '2520375397', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('03f6d7d4-73f0-409b-bf23-2ef3de8c6061', 'shreyamandhan14@gmail.com', '$2a$10$i71P49szDkbT5pJYzxNLPeOA1clW0QAXBtybQIKj87ZI3swpJNVtm', 'Shreya Mandhan', NULL, NULL, NULL, NULL, NULL, '2520010651', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('0507e6bc-5db8-47d0-9ba0-faa6f582c945', 'deepshikhw@gmail.com', '$2a$10$fHIWuA3xSFdnPFpI8rJz/.v/6y1eLZZfBXwmMuy6ZbaEyCgHNyUOi', 'Deep shikha', NULL, NULL, NULL, NULL, NULL, '2520010200', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('055e119b-9471-4106-8d3f-1f89ebe21ac1', 'singhalronit123@gmail.com', '$2a$10$TV/jY6uO2LpgtaEHWtct7OXyGTMsYlj/BR1QbXOrpAUInmwoRtnMm', 'Ronit Singhal', NULL, NULL, NULL, NULL, NULL, '2520010299', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('05bf095a-5fc0-4a10-a5c6-a3b35fb45880', 'arukshagahlot0088@gmail.com', '$2a$10$2OCT9um6vno6C1MLNsREn.NkR/uri/h0mkJFMVeixHBCsijNlvX6q', 'Aruksha Gahlot', NULL, NULL, NULL, NULL, NULL, '2520010465', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:08', '2026-05-02 12:01:08'),
('067db325-b04d-47bd-8c17-b90480ca2b48', 'shreyakanwal124@gmail.com', '$2a$10$ncS7cThUInDC.atBmWy3Gu2iHKOfzDXhHtAxMk9eqYw69l970QBiS', 'Shreya Kanwal', NULL, NULL, NULL, NULL, NULL, '2520010556', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('073c7ebd-168a-406e-8a69-825325aa7685', 'aryansharma12062019@gmail.com', '$2a$10$q1sBETLb59yKugNFP6JZiOl6a.Cazr5dcW1EzXhxgXXCxyJ.WA4JK', 'Raj Aryan', NULL, NULL, NULL, NULL, NULL, '2520010249', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('07c99523-3c2e-4bc6-9748-f58bd3e7a794', 'riya80724@gmail.com', '$2a$10$Gz.Z3tSPXg8JgiD5Lwb5weEDLXCVVuQ3Mew3.tX6uTmrGJJXZptkK', 'Riya Sarkar', NULL, NULL, NULL, NULL, NULL, '2520018121', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('086e88ee-c307-4001-a311-bc3e7d188876', 'gaurvi.bakshi2004@gmail.com', '$2a$10$L4819OtrXFvOp2b4c8aRS.ntlVcPGuzy0X3gx/eRi2wX4yX1/73AC', 'Gaurvi Bakshi', NULL, NULL, NULL, NULL, NULL, '2520010349', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('0a1d9789-4cc2-4540-b342-0992de434af1', 'gupta.aanchal612@gmail.com', '$2a$10$zi2ehJRkP3zNs96M1xbOnuZ8w.fYBRQ/gkKnrjEIaBqFVXXbEWB8u', 'Aanchal', NULL, NULL, NULL, NULL, NULL, '2520010237', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('0bb1cfc1-08ea-4d2c-b526-fc7866d252aa', 'devanshgoel0622@gmail.com', '$2a$10$X1B466xulP8Ys7sIjKNMCeW/vB8gi0Z1t.4D0tu5.PYiTreITAvFG', 'Devansh Goel', NULL, NULL, NULL, NULL, NULL, '2520010759', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('0bb7b3e2-50c0-4d8f-8c23-188d01b8c3b4', 'ashutoshsrivastava.mgt@geu.ac.in', '$2a$10$4Di6N1ydRxIXj9lzEMzADeJ2dFG6h2ztjc/YESX8d9OHo1ro2VQ6y', 'Ashutosh', 'Srivastava', '8126134565', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/profiles/b926679c-846f-4be8-8cc4-03d6de3e5e94-1778061696351.PNG', '', 'IT101645', '', 'ACTIVE', 'ADMIN', 'ADMIN', '2026-05-06 12:30:24', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:44:49', '2026-05-06 12:30:24'),
('0bce7eec-4ac9-4ccc-8186-6ff89fac3b4c', 'negiarpita87@gmail.com', '$2a$10$zOqNsRQaxGb1iEDDlFohSOFBNPMsU7fRDo6LUoKZ1E1vk2DD1jRty', 'Arpita Negi', NULL, NULL, NULL, NULL, NULL, '2520010542', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('0c732784-65d5-48cb-821f-396be2987eb1', 'aakash337726@gmail.com', '$2a$10$W1jQQ3f9stRzSyfHh6dQh.XCagU6CoGdyGiv92MiIBDGnCiN4lAdy', 'Aakash Madan', NULL, NULL, NULL, NULL, NULL, '2520010182', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('0ef670f2-7987-4961-85f8-c65b9377b02f', 'manassinghkarki@gmail.com', '$2a$10$ux6bR29/WAByJD7bGF2K7OXn2PKUZdeITHDM0LsM.Vks43F471Y1a', 'Man Mohan Singh Karki', NULL, NULL, NULL, NULL, NULL, '2520010517', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('0f270025-f73a-4ccd-aa0d-bcb8d0567c71', 'ashmitjoshi34@gmail.com', '$2a$10$X9FEfAWvUhQ2rLjifqXQJOU1jn3QWz9.eEj4of4x7t7KGLVNq/TKK', 'Ashmit Joshi', NULL, NULL, NULL, NULL, NULL, '2520010505', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('11c5cb2f-1ab8-40a9-962f-d23c5dd5fc29', 'nehamahanandia9@gmail.com', '$2a$10$LNBeJ0EkO8zRmdwT2W75DuUrlde1FBVELnLX1M86xN6.0EEI//Rli', 'Neha Mahanandia', NULL, NULL, NULL, NULL, NULL, '2520010218', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('12306948-a632-47e8-bce8-1b2f4c0df801', 'kajalantil10@gmail.com', '$2a$10$IkXvUzeaFR78IJ3O18/ttOn1EtO2NbIVr0fo/aR9HBBLNle6cBMp.', 'Kajal kumari antil', NULL, NULL, NULL, NULL, NULL, '2520020003', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('16ab6a64-8a38-4e83-9012-3999ffd10f5b', 'kanikaverma979@gmail.com', '$2a$10$f9vX86NZW40XMf4ZFySX7us8Rbsbg5zgassByxBwyIMoMjdWqUEhO', 'Kanika verma', NULL, NULL, NULL, NULL, NULL, '2520010241', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('16feba10-9e74-4f7d-9025-ec86fd56f770', 'shivamdharisingh1@gmail.com', '$2a$10$9qnAj6K5NFOLyD.KMICxpeHOjiDeWE5D.luotVosm/aX2zbKp9s.W', 'Shivam Dhari Singh', NULL, NULL, NULL, NULL, NULL, '2520010512', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('1767cc16-2a17-453a-899e-6ea0dc1bb9bb', 'saurabh9973446200@gmail.com', '$2a$10$wc/UnF5BgiUP81hgAmlnneF6/FGfOBUzvyUJa/c4PPWWJBWT8UeJS', 'Saurabh Kumar', NULL, NULL, NULL, NULL, NULL, '2520010245', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('180f3caf-001a-4c31-9536-62f3695530c8', 'akashsingh2508@gmail.com', '$2a$10$dTYIQhuLyJJj/.rpm0lB4e0/pqOe4.t3xkjcJlH7mTanVR.TDWdvO', 'Akash Singh', NULL, NULL, NULL, NULL, NULL, '2520010621', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('1883750a-8489-410b-b932-e87c9827de96', 'hc695928@gmail.com', '$2a$10$pagarVnP728xsvEsZZtWLeras06VG5oY/MY.Nfq7dab5xlpxx8pEa', 'Harsh Deol', NULL, NULL, NULL, NULL, NULL, '2520010129', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('1895f85c-3012-4610-bc24-da316e3c3320', 'aayanraj644@gmail.com', '$2a$10$n/cEa9bGsnEnoQZbSVAqg.uWGwFBOHQn8Vt6vStbMXOb8yP1XCTWW', 'Ayan Raj', NULL, NULL, NULL, NULL, NULL, '2520010246', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('194bed9c-c992-4605-ab8d-a5ce97efdda7', 'sainibhavin70@gmail.com', '$2a$10$2bpokH2ucKB/duPYXZVuN.svNgqhE3eSly5a5N9FsN5ovGF0H/RCG', 'Bhavin saini', NULL, NULL, NULL, NULL, NULL, '2520018403', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('1a22bc7b-9aaa-4970-b5dc-484713c3737e', 'tanvisachdeva2004@gmail.com', '$2a$10$utlR6PVNMvch/IHfGNYrbOm0IughxATUC6SI/7VLMlFanj2zRR4Su', 'Tanvi Sachdeva', NULL, NULL, NULL, NULL, NULL, '2520378054', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('1ac5335a-bbd6-48c7-ae70-04b008234c8e', 'shreyaa0073@gmail.com', '$2a$10$.NG.hn11rY35tSk2Dt72bulBI/TGyDb.BEFB8cJiJmp.9oUUBXCL.', 'Shreya Kumari', NULL, NULL, NULL, NULL, NULL, '2520010114', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('1ad22d86-7ea5-4943-908a-c75ccf38cb3f', 'aditifaizabad@gmail.com', '$2a$10$nP5G/a2ViFi89h.14JgmGOD9bk/TP9AOnpfAiQ1ThGf6t3iGgN4D2', 'Aditi Srivastava', NULL, NULL, NULL, NULL, NULL, '2520010393', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('1c4a5a49-190e-4890-a024-00ba70cedc5d', 'lakshitagehlot4@gmail.com', '$2a$10$toLXH2vvSS3RJzZgMo9qZu3H5wLymIgCFbw8NYbt74rXxA/vION.i', 'Lakshita Gehlot', NULL, NULL, NULL, NULL, NULL, '2520012169', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('1c68543d-b464-4c91-ad6b-6d69034eb206', 'nishajoshi151204@gmail.com', '$2a$10$p/XZm/lQEVwuQsKEZu/8xePRq9srG97s2l3OX4JCXfa/eOmMttnay', 'NISHA', NULL, NULL, NULL, NULL, NULL, '2520010654', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('1c7781d2-c685-4fd9-844b-03a2c59e4115', 'badolaanukriti@gmail.com', '$2a$10$jji7.kU8VPcupk1N8C.RxOB5PsJfjrAyQxlniXlONmfyqqWrRfxvO', 'Anukriti Badola', NULL, NULL, NULL, NULL, NULL, '2520010606', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-03 06:34:09', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-03 06:34:09'),
('1d08f147-df7f-4ac9-a82c-8e7ffe485fe1', 'varunguptaddn@gmail.com', '$2a$10$bDxvqsPZj8uNK7r.4ydNvecJ3bJRCcWZ1kh/OtPZvphcDn6GzVj.q', 'Varun gupta', NULL, NULL, NULL, NULL, NULL, '2520010368', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('1d90cd89-26db-4937-b843-12f9e91d9673', 'mayankbhatt5632@gmail.com', '$2a$10$ggdg28C5rb0vExldTcaBLOaYKC/bRKFUH.PatbESiBNr5v5tJKJmu', 'Mayank Bhatt', NULL, NULL, NULL, NULL, NULL, '2520010355', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('1d93b8c9-e0e3-4e18-8e70-522ce8605b10', 'ghoshsurangama29@gmail.com', '$2a$10$d575RBuSWoyMGV6LmaudmumSe8uFhVkegghmdkuX3A8lxoDQCOU9S', 'Surangama Ghosh', NULL, NULL, NULL, NULL, NULL, '2520010213', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('1e458832-aece-4d36-9ce7-5cce4d5633ef', 'agarwalanushka2511@gmail.com', '$2a$10$sdA9951w2vA41iDv3rO6QeE2no5Qq741dxJxTpvHhKvJQ4TLu.pR.', 'Anushka Aggarwal', NULL, NULL, NULL, NULL, NULL, '2520020001', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('1eecc2fd-7167-4a00-b228-e0f7c29ed424', 'malasia358@gmail.com', '$2a$10$JRk8vJOl9Wp/LJ780bYRpetpEKQMfctg.MNGxvhi14nHQm8.0E.Sm', 'Archana Malasi', NULL, NULL, NULL, NULL, NULL, '2520010699', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('1f498abc-bd95-4510-bcbc-4aeb9d4b834c', 'session2@geu.ac.in', '$2a$10$oEZ3/HkE.GUzvKhihvUX9ut2vs807UBprE/Nn7FspF81rHdGSnyAm', 'Session 2', 'User', NULL, NULL, NULL, NULL, 'ss2', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 0, NULL, NULL, NULL, '{}', '2026-05-03 07:25:33', '2026-05-03 07:33:23'),
('1f8cf326-355e-4c38-8bda-c65e20b64eb5', 'ojaswilakheru14@gmail.com', '$2a$10$vgexDAz0kZxtZdlE.J.fkOs/JkhMMS9frIahRAnPFEwUGQogFo8oy', 'Ojasvi Lakheru', NULL, NULL, NULL, NULL, NULL, '2520020043', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('1fe86b98-19eb-49e0-bee3-b19408ae4d5d', 'butolaanjali07@gmail.com', '$2a$10$WT4NChSgiStfj1CudzBBaekkezZyqz/ZVI9ZhS1YNb.dhRzfMovfq', 'Anjali Butola', NULL, NULL, NULL, NULL, NULL, '2520012008', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('205fe399-dc9c-4387-aae0-cba28d0d273f', 'faisalchoudhary636@gmail.com', '$2a$10$5FowHQchNZ3lnBC71kiYJePsaJjlUjsGHKSrfrCX/LvL7okoqE.Vm', 'Faisal Choudhary', NULL, NULL, NULL, NULL, NULL, '2520010025', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('215fbe58-672d-4979-a70c-b2e91587a333', 'shubhangibaunthiyal@gmail.com', '$2a$10$IXtsvH.0VKEXZMoJ6.anLOhb2IJPu/VH.GFIXeNXkhKbihTSxpVBu', 'Shubhangi Baunthiyal', NULL, NULL, NULL, NULL, NULL, '2520010285', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('22894785-911a-4c6c-a327-cb16b3395694', 'ashwinsiwach8@gmail.com', '$2a$10$LsDsvTX8Oohe5Z3in/fTDuqRYHVLOsGh0GvSlsmFY8.fVu4RtpXqS', 'Ashwin Siwach', NULL, NULL, NULL, NULL, NULL, '2520010385', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('22cbeeaf-b250-4bfa-9544-86b6951399a1', 'chandrikatulsani7003@gmail.com', '$2a$10$n5EMjo3JVFQtJ9kplwuxmOmucFZlInS/dqhaPEBjGF6V6KKPpy5FG', 'Chandrika Tulsani', NULL, NULL, NULL, NULL, NULL, '2520020013', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('230ba947-8061-4945-8d3a-0e64303897e6', 'bsrishti024@gmail.com', '$2a$10$gYkZKlreG.RKOxE.ol2NTulGPUNyzNLjDBHLUvb0Be1fMm54kP78.', 'Srishti Bhardwaj', NULL, NULL, NULL, NULL, NULL, '2205010620', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('23384a33-e924-4a35-8d83-61c5a3a807cb', 'bhartirana543@gmail.com', '$2a$10$m5ZGl9EzUARZIAEYr.Wlu.acPcdj/BiVxdIeBv8tyWfdTWFw.NQVK', 'Bharti Rana', NULL, NULL, NULL, NULL, NULL, '2520010251', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('240dc0d1-c8c5-495f-a62a-33ee5610b650', 'gargiy113@gmail.com', '$2a$10$DCsaFCQ9HCQSECoy57d/luwgYVTnpESDhWW78DNkP28E/kYhjxjDu', 'Gargi Yadav', NULL, NULL, NULL, NULL, NULL, '25201255348', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('24ce0038-2f04-473d-9a26-b26f5eee94b4', 'hr4860680@gmail.com', '$2a$10$3.Euj1hfl4/bwvicbtTQ3.7xCIgja0BDXUOMt/KSerG6efCni0fZu', 'Harsh Rana', NULL, NULL, NULL, NULL, NULL, '2520010449', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('25f9cdd7-8a63-40c1-992f-542ace7da24c', 'sakshichaurasia248@gmail.com', '$2a$10$sT69tp5ZWa6/b8hp/tka1.LrazIAEr6DcMc68jvbg0T5uvhFo.52S', 'Sakshi chourasia', NULL, NULL, NULL, NULL, NULL, '2520010256', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('271689e9-e6a9-4fc3-9359-4340e0e255d2', 'mandeepsinghbhinder4498@gmail.com', '$2a$10$8Rq8LO0GLbvSrC9zU9qE3eubSz75LNWe0SBiuZSygvyafQIRKvCJi', 'Mandeep Singh', NULL, NULL, NULL, NULL, NULL, '2520010069', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('27a554a1-2a14-4281-bce5-ab4cfb5b3505', 'rajputpragya37@gmail.com', '$2a$10$wAR5li5SGQmYmn.a10Sqlegu5g70ne63rrX8H5G1Rp.Dso9CfioZ6', 'Pragya rajput', NULL, NULL, NULL, NULL, NULL, '2520010475', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('27e3acab-a559-4848-a072-5a622f90a033', 'amratansh7599@gmail.com', '$2a$10$4LLimLSIp/In7T0JdV2TTuZE8d6A9I7EPBu0apytgLFSuesgeYIkK', 'Amratansh Agarwal', NULL, NULL, NULL, NULL, NULL, '25201150607', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('282a3c0e-9b51-472f-b1c8-b27b3e83bd35', 'aditikushwah02@gmail.com', '$2a$10$1DWlBZloY3Lq9ky6XicCNuLp0./Mro6mk/h0TZuDIL8WCVNyGl.S2', 'Aditi kushwah', NULL, NULL, NULL, NULL, NULL, '2520019492', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('2937ef63-a9ff-4fdd-a0e2-b62e87062b87', 'dsr3651@gmail.com', '$2a$10$QR5/JQMQuWgisRsHubt7WuYHQ8.rFJCI.xJw7YQ22yUjyx7efj8mW', 'Deepak Singh', NULL, NULL, NULL, NULL, NULL, '2520010507', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('2a323008-9cb2-44ce-a87f-55e3ce22cfc7', 'rshivang416@gmail.com', '$2a$10$.LqgurawG7YzuoMGFjXkR.BiHxfqtIC60el2Iwa2eDew8K24LOXqK', 'Shivang Rana', NULL, NULL, NULL, NULL, NULL, 'Na', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('2b212e93-6e00-4072-99fe-03329f1a4ee8', 'radhayadav9358@gmail.com', '$2a$10$vK7M482J/sHPY0dEf0g14e.Di9OhSmt5L1tLDHOtLZInPGGvxh5aq', 'Radha Yadav', NULL, NULL, NULL, NULL, NULL, '2520040007', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('2b618397-394c-4d50-84ce-9a2b54ab0197', 'sadafsarwar432@gmail.com', '$2a$10$wlhi2n91HF83vtK8JYbu0eilWs5cEsV41r9SXKgoYekuULG.sLntu', 'Sadaf Sarwar', NULL, NULL, NULL, NULL, NULL, '2520010582', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:09', '2026-05-02 12:01:09'),
('2bcf1680-d27b-4726-8ed2-eb47b2088b59', 'kumarjharahul077@gmail.com', '$2a$10$B5BAYKlGUarMmzHS8vHn4OuoyqdxUeE0muimcYEXL.fyt8vtG5srq', 'Rahul kumar jha', NULL, NULL, NULL, NULL, NULL, '2520010047', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('2c0c1c19-1439-49de-a359-3a9f5b551438', 'yadavmuskan990@gmail.com', '$2a$10$2Z6urHwLRdyBmRpSVKupweuFGDkailj5WCIXEwI9Vh54pM7H7KaS2', 'Muskan Yadav', NULL, NULL, NULL, NULL, NULL, '2520010544', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('2cdafb55-4729-49fe-932d-359d9a0981a8', 'meghapokhriya48@gmail.com', '$2a$10$tugqdSt5O7jtIpjIWvHRYurLpdowIKsXAlyyTXIR3sUYXlNVgrAqG', 'Megha Pokhriya', NULL, NULL, NULL, NULL, NULL, '2520011617', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('2f15b5b2-d764-45b2-b8c4-4d11a0abf6b1', 'lakshaysaini104@gmail.com', '$2a$10$xwT1Te5T8Dh5pZ4wsXiCAOK4iUNO5hD7Xvgjqvz3zCem3NjiBqqga', 'Lakshay Saini', NULL, NULL, NULL, NULL, NULL, '2520010102', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('2f8095f6-8868-48f3-adbf-b41a51943aa6', 'shwetavats671@gmail.com', '$2a$10$GskecCHF1JSvjTvTKi49Duak7.56eSmXmJ/QR9NRasAUlbLIN8XMW', 'Shweta kumari', NULL, NULL, NULL, NULL, NULL, '252001022', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('2fddf62b-eb9e-4a95-8ced-443f80555a22', 'anhadthakral15@gmail.com', '$2a$10$L2mrpj1KPyu2aawCEPv7V.XvSgCwk9sL5H5ncgb/41C7cc14bO192', 'Anhad Thakral', NULL, NULL, NULL, NULL, NULL, '2520010060', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('30260896-fabd-48cc-9c04-f600987f1f23', 'lovybagga@gmail.com', '$2a$10$.2RExTsGQkomcnJJ60hb6.AtFWeLvR2oIEgrSE0ysO2xUasAcF75.', 'Lalit Kumar Bagga', NULL, NULL, NULL, NULL, NULL, '21871581', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('30507dfe-192e-4c31-a6d0-924f0e4935d0', 'i.anushkanegi@gmail.com', '$2a$10$rKCJhk0DxkI0pl7KV7Wosuw1PFQlEICcfVt.gZ1jgEBH/O7h66juK', 'Anushka Negi', NULL, NULL, NULL, NULL, NULL, '2520370010', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('3117c295-98ef-4e61-8bc8-f06175d1ea39', 'aryan0427kumar@gmail.com', '$2a$10$DXYiukmGvHg1RphuMwE/tuzJBVBq1Upocf/zP1NkpwXeWdm5n1Yyi', 'Aryan Kumar', NULL, NULL, NULL, NULL, NULL, '2520010695', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('31358d0a-77f1-4682-a2f8-ef8d2e2186f3', 'mohd07saif@gmail.com', '$2a$10$RJovzrDvMXPzKtB6Edqf/ODsSSBCCtkPfcJaQXSCVg7nfOdMmaHry', 'Mohd. Saif khan', NULL, NULL, NULL, NULL, NULL, '2520018398', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('314a0bc5-5fa9-4870-ba1e-2ff30fb359c1', 'tyagiayush272@gmail.com', '$2a$10$EHIRjrxmMaRrq5WUX8kv.ensVwhlAWxFt3Zo8dNWBR80zGaWS.0hu', 'Ayush tyagi', NULL, NULL, NULL, NULL, NULL, '2520010607', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('31759ef5-23af-4af7-bd12-0ead5e6f4c56', 'saurabhyadav798247@gmail.com', '$2a$10$ALx9rDRhVOvAqUQdVGmQDOzYY0eoiYJfWgjBlKgzK/CicE4kdFACi', 'Saurabh Yadav', NULL, NULL, NULL, NULL, NULL, '2520010100', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('322b1c1a-ca04-4c8d-8149-af95b91dfd51', 'singhhoodaarnav@gmail.com', '$2a$10$fFgWq8Toh04Jttzv/Jkw2OIlB3XJ0B6bwU6w/vMI4kLnXuuT/9mEa', 'Arnav Singh Hooda', NULL, NULL, NULL, NULL, NULL, '2520010392', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('324e1fbf-d244-4d68-bdb2-1db2f8ce23b3', 'shrutichahal2002@gmail.com', '$2a$10$ASIFHX2Ox2.mex3fUhFfO.rCNi5vhMNcBBHVRooivPsmFTWJvrEXG', 'Shruti Chahal', NULL, NULL, NULL, NULL, NULL, '2520020029', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('3354613a-5ad9-4a68-80a5-86901da3a5b1', 'jadounpponam22@gmail.com', '$2a$10$pQ1.lGIsk0YEJT5kKfYhWeToeeBtU2iyfkmhogoBbZUvgyKOk3JX6', 'Poonam Jadoun', NULL, NULL, NULL, NULL, NULL, '2520010152', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('343c0a2d-dccd-47b5-bdb9-fae5ac20f6cd', 'akarshp380@gmail.com', '$2a$10$GeTgXwLgBAcETjbPaQjxbe9MIYx21bHUrW9y8UiyLbDJqNt.o/WB.', 'Akarsh Parashar', NULL, NULL, NULL, NULL, NULL, '2520010521', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('346ea0c4-9cb7-44f3-a0c3-f092b0693313', 'gaurrudra702@gmail.com', '$2a$10$JXlaV/ejJbINs2xcIN7hB.Dw2DPKUEAGwPgUyYJSl8rQOippr6lWi', 'Rudra Pratap Singh', NULL, NULL, NULL, NULL, NULL, '2520010655', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('34b18ead-15f2-4f6a-9564-662813d471b1', 'akshayrathour09@gmail.com', '$2a$10$j/d2v9cCgjB1XUNHG3gPfeVlT9r2p3vrSw4acRyeSi.POsE8j7RuC', 'Akshay', NULL, NULL, NULL, NULL, NULL, '2520010637', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('35aa01fd-6b11-4431-a275-155ce4257413', 'tulikakishore2712@gmail.com', '$2a$10$V6hO/u3aOZlIToXJo2x8NeLNmIPi.XM.OAWVYLqZC91uUK/4YDPhy', 'Tulika', NULL, NULL, NULL, NULL, NULL, '2520010476', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('35b6cb46-c403-4c4a-b6d5-5b208720f0c6', 'manishmanral308@gmail.com', '$2a$10$JsKsbb.0iSgwd5JWWYYI4u/3X7vsTu4ERIndn.gzGip.V.dD/nlDS', 'Manish Manral', NULL, NULL, NULL, NULL, NULL, '2520010673', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('36cbc62a-ae07-4b8a-974c-b843f9fe6bd0', 'dasilakashish355@gmail.com', '$2a$10$PJ/dB6BpUmbq.mKxKDu4euUTK33zcXtF7LytMR4aW6fc2Ft74BdoO', 'Kashish Dasila', NULL, NULL, NULL, NULL, NULL, '2520010427', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('3701ebd3-dfcd-46cd-a5fe-41c3f9369ecd', 'architsingh9608@gmail.com', '$2a$10$8ytolGrhEbn/r6.UwTE3G.GZKv.7H3YMWA/d8gnbnZ4hyPk/QarTC', 'Archit Raj', NULL, NULL, NULL, NULL, NULL, '2520020505', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('39e84890-933b-4035-9795-b74422b3b743', 'mansimu11@gmail.com', '$2a$10$YTrTDXcqpQ0rS7XHFvmrtOgrYycdUYLgWIGel.cn4mtcwICK/dzvS', 'Manshi Upadhyay', NULL, NULL, NULL, NULL, NULL, '2520010233', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('3a102b28-30f2-4f3b-b363-fc440bd94803', 'mehakkothari04@gmail.com', '$2a$10$A97noeGxmeXYFExS2hFHFeDiRm9cla1.CHEKst5CjUFQUv9f0N/Rq', 'Mehak Kothari', NULL, NULL, NULL, NULL, NULL, '2520010310', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('3a877efc-55b7-477c-a19e-43c97f8f3073', 'sneha.khurana3236@gmail.com', '$2a$10$huAdAI2sr827/QB6Jx.1LOztcwcJsSFCbryaeDl3KXIMTtmDpuFk6', 'Sneha Khurana', NULL, NULL, NULL, NULL, NULL, '2520020032', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('3ae0ac3d-c093-4aca-a868-af19571c80ea', 'shashirohilla09@gmail.com', '$2a$10$wHaa6z.51taz471BeLqjFO.QiqEoDgM4XgBHo5KtWtSl78AT1/RG6', 'Shashi', NULL, NULL, NULL, NULL, NULL, '2520010268', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('3aebba36-e922-4e6b-8d75-63a8f834a04e', 'priyanshus482@gmail.com', '$2a$10$E3irmhA0P9lt6sJ6tqU3vuJ3jEKmOOkYSJ8h6R9ULyYQi/eJru7la', 'PRIYANSHU SINGH', NULL, NULL, NULL, NULL, NULL, '2520010435', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('3bae765d-fd48-4837-a364-2ac3c3f349b0', 'poojamishra6756@gmail.com', '$2a$10$qqzIzZOULkHOYNqk75gWvOlz3TXMeMUFN0vG08EmyNZNd3nt1uYeG', 'Pooja Mishra', NULL, NULL, NULL, NULL, NULL, '2520020035', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('3bd65c66-1750-4b55-848b-0e72fc2a7c2f', 'rhythmbhatia309@gmail.com', '$2a$10$Nw9oIqH5q8iMFfyWJciMAuib4emEMR2WScoBWjU/9nVHrHNln5n4K', 'Rhythm Kamboj', NULL, NULL, NULL, NULL, NULL, '2520010389', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('3efe5a7e-33ca-4177-9527-df863a0cdead', 'niharika02dutt@gmail.com', '$2a$10$4doosl2HSR9MALr/XEHRJuL8fDYcUrJv/iDb5xJVytiucZdwd549u', 'Niharika Dutt', NULL, NULL, NULL, NULL, NULL, '2520010267', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('3f896c86-ca34-485d-9cb2-6c861a2a74e4', 'sashanksahay808@gmail.com', '$2a$10$ww9YHeQNQAucPIEx7Puor.9hctt8O.6Yas6UDFi/VycBZ.N4Qlg6m', 'Sashank sahay', NULL, NULL, NULL, NULL, NULL, '2520013004', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('40f4dc9f-a6e7-441b-8303-7064092f577a', 'coordinator@example.com', '$2a$10$DdxqX8YYvDT7s./1O77mUeFf1JQ6rEJ.cY4KrEYwS6jjlmsC5G7iu', 'Jane', 'Coordinator', NULL, NULL, NULL, NULL, 'PC001', 'ACTIVE', 'PLACEMENT_COORDINATOR', 'PLACEMENT_COORDINATOR', '2026-05-06 09:59:55', NULL, 0, NULL, NULL, NULL, '{}', '2026-05-03 07:08:14', '2026-05-06 09:59:55'),
('431d5c0a-40fb-42a5-a4dd-20a072a6509c', 'srishtiraj2004@gmail.com', '$2a$10$6G0r9g75sfz8VRjIDAre6.vXGiDAC7SsRln9fP6SwieDp0s6VFrMS', 'Srishti Raj', NULL, NULL, NULL, NULL, NULL, '2520010390', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('43afab98-d7c4-49de-8b0a-58e9f3228770', 'nirjharajoshi@gmail.com', '$2a$10$pHd8KbEl28wT9HAMl/rMK.SfemGimOv8WwDHzKvalDdRWpHFeJKrq', 'Nirjhara Joshi', NULL, NULL, NULL, NULL, NULL, '2520010496', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('44f37800-8dd0-403a-b1c2-252428efbf20', 'rautelan77@gmail.com', '$2a$10$y/vtqzl20Zpt2NF3qHqb2OjoJhyt30lOZY79Sa0mj6V/wLzgigYcK', 'Neha Rautela', NULL, NULL, NULL, NULL, NULL, '2520010382', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('45555431-6d78-4c52-a4d1-27d124cd2ede', 'ashisinha0211@gmail.com', '$2a$10$koe/uOtRF.7ecWlryNtYx./hAnF1/r1v6TnEGkUypUhVQ.AgRJOkC', 'Ashi Sinha', NULL, NULL, NULL, NULL, NULL, '2520010215', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('467cd488-3ffc-4e82-b59b-77776910ec88', 'anujamalakar@gmail.com', '$2a$10$Ghy1Pb1An41a6zD4Uzg96OtdkZkKmlTczM9OqmiKTJckuBIsuOd3W', 'Anuja Malakar', NULL, NULL, NULL, NULL, NULL, '2520010470', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('4730b05a-a758-485c-94d8-b5500da8aeea', 'sarthaksingh00001234@gmail.com', '$2a$10$1nBMt2CWZqAs/PHRpCrcE.6B84Ew3Yt6npiTFdO6cOWLqpaxwNuxy', 'Sarthak Singh', NULL, NULL, NULL, NULL, NULL, '2520373880', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('4a5df41b-3def-4737-900e-a3c67acd6fdd', 'evagunjan@gmail.com', '$2a$10$lkuPx/YLwN3fg9PTTlYTpu3Yq.E5TUgA1oWNk22GlJ9lD1YVlZwwy', 'Eva Gunjan Rana', NULL, NULL, NULL, NULL, NULL, '2520010091', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('4c2004c7-4efc-4ff2-90d7-7313ad2ec5e1', 'ankitmahar0406@gmail.com', '$2a$10$UkYOnk1.6OkVTa8e4txKHOK5DyzNurZyY4BJJtCXXTHWDygg8D2dW', 'Ankit Singh Mahar', NULL, NULL, NULL, NULL, NULL, '2520020037', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('4c3f7989-342a-4911-9251-19feb2a3a2ec', 'Pavnirastogi1412@gmail.com', '$2a$10$Pjmmf6wu6cZwZCBVvnTfbOgN9F8RZdovSTI0pBW01BU7rL5OPH4y2', 'Pavni Rastogi', NULL, NULL, NULL, NULL, NULL, '2520010669', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('4dd2b3b1-69e7-4d87-991b-0f4fe378f85d', 'sagarsj2004joshi@gmail.com', '$2a$10$PCKA5Q8cgE2PAqoi3WCiZeG/PXjgb0K0WLc8zf6ny93ZyWlFZA3Nm', 'Sagar Joshi', NULL, NULL, NULL, NULL, NULL, '2520010684', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('4e363dce-9d60-4b72-b9de-9a90f435999e', 'annulohkana868@gmail.com', '$2a$10$mFrta3sYjTFC1jGFO6qEtuIDasvULCv/PknGxlgYIYVyGez4ViCuu', 'Anuradhari lohakna', NULL, NULL, NULL, NULL, NULL, '2520018957', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('4efaf98c-42ad-4561-9291-c3bb6c64c134', 'sainichahat977@gmail.com', '$2a$10$EsmGhqovkGpaoPz5/Oc/MeeeymoxFrfSkEf691Xlp9oimWnuAT8Ry', 'Chahat Saini', NULL, NULL, NULL, NULL, NULL, '2520010471', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('4f584135-f6d7-4408-a6de-b57474470951', 'mukulnegi4123@gmail.com', '$2a$10$EyBr7v2hcljaaFDoBOc4z.hx7DH6T.d7ArvZE0F/H9s6kXSnJeJxe', 'Mukul negi', NULL, NULL, NULL, NULL, NULL, '2520018540', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('5096e05a-228e-46d9-8a50-fad542461afc', 'sneha.panwar2203@gmail.com', '$2a$10$y3k0z/rstExzo2HblhkoPe4TZ9NEySUrJwCqJwxlW3NLgksHO7MVK', 'Sneha Panwar', NULL, NULL, NULL, NULL, NULL, '2520014982', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('511eea69-4e02-4c5d-81e9-e9c2920a6141', 'singhriya3703@gmail.com', '$2a$10$GH2p4dZgJjeSEBD6sNrAwOIDSDPxSdtUVpUnVsqD.kUzzGmZWSFq6', 'Riya Singh', NULL, NULL, NULL, NULL, NULL, '2520010451', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('51a48d29-9d1a-4bb8-b212-65e0b878185c', 'khaniram5945@gmail.com', '$2a$10$2o4rD7THFjIpVBqPn2uZieMLqyCvALqbNvrzZCIoFhXwRHMkbf.qG', 'Iram', NULL, NULL, NULL, NULL, NULL, '2520010586', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:08', '2026-05-02 12:01:08'),
('53456d41-81da-4966-9a7a-a7603ace187d', 'suhashinijoshi@gamil.com', '$2a$10$gd5mVjAcMLzTtye8rzHniezfYaWXyXrgEBTuX31enFhUomPcU53.O', 'Suhashini Joshi', NULL, NULL, NULL, NULL, NULL, '2520010220', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('536367fb-a04d-4773-a05d-a6cc63aa8b95', 'prajjwalarya898@gmail.com', '$2a$10$zx3pCqIodvOrFH4z40Io/ufsSUDE1fMbA4DkzY7WmcUC61451Ktmu', 'Prajjwal Arya', NULL, NULL, NULL, NULL, NULL, '2520010276', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('538a05d0-acca-443e-a8f9-62131f7f8bb9', 'shalini1808sharma@gmail.com', '$2a$10$Aw0KRQUJ621dbmO2QBvOL.E77IzGOrThQDJ2UvZH8ZXog4XqP1nNm', 'Shalini Sharma', NULL, NULL, NULL, NULL, NULL, '2520013462', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('568f98a3-3656-45c9-82cb-b079abe0febb', 'ashichaudhary2004@gmail.com', '$2a$10$53UyWF.Q9CMKDRfD7ea1x.dA7H21Xs5ItEE0/.gkV6fp6zieAw4O2', 'Gargi Chaudhary', NULL, NULL, NULL, NULL, NULL, '2520010710', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:09', '2026-05-02 12:01:09'),
('569534f3-7a4f-43ae-b98e-5ce1e5d9769f', 'varshneykhush8273@gmail.com', '$2a$10$3UrGNUv1nKc74ng2YNhqoeWR3bgqHys4rbsDtCQ.1Y35J7QFm7Yza', 'Khush Varshney', NULL, NULL, NULL, NULL, NULL, '2520010615', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('56d60aed-c2a5-467d-bf4e-901e7988c061', 'prathamsingh8527@gmail.com', '$2a$10$t90IjOdoP9yYjshA8ccrM.z9IOjWvTyIAaaPk6YrJCZqmZhqObSEG', 'Pratham Singh', NULL, NULL, NULL, NULL, NULL, '2520010609', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('56f4c3c8-91be-4135-a32c-49970bdeedda', 'rutkarshanand@gmail.com', '$2a$10$a0kkqVYaifM8.sk4Sae9IOJbt3181wWp/MAhJiNwTtrwAc2vklNSi', 'Utkarsh Anand Rai', NULL, NULL, NULL, NULL, NULL, '2520017841', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('58152982-6c24-4e5d-8e41-27fe9e9ee315', 'tanujachufal7@gmail.com', '$2a$10$qfxnfBaUnDXMUOrK3gW/o.odld/byjbC1PxLOY3gRbRqBsS6MDiM2', 'Tanuja Kumari', NULL, NULL, NULL, NULL, NULL, '2520010608', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('587d2900-a195-4342-9313-c0f68c2c38b0', 'radhikagoyal.1107@gmail.com', '$2a$10$Arkx7uGW6u7hG2DFfvLkiuMvKZWbm9WgRrnxUvK1RIRrZlpEoeO7K', 'Radhika Goyal', NULL, NULL, NULL, NULL, NULL, '2520010479', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('5998db59-f8a0-4ed0-b14b-1e49d73c0930', '3104sakshi@gmail.com', '$2a$10$jkTvvmBqchv/jt.0wo1QOeZgYvFIETLNM6TrphmAyg9HOIFC5NjEe', 'Sakshi Bharara', NULL, NULL, NULL, NULL, NULL, '2520010486', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('5a1138d4-bda6-4d95-be00-12949d0e48b8', 'yuvrajbisht848@gmail.com', '$2a$10$.WiT3PQ1hglq5OSXteVE2.H3Ka14Dks152G6/WXtli96WhXvXkGki', 'Yuvraj Singh Bisht', NULL, NULL, NULL, NULL, NULL, '2520018693', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('5a2960cb-3433-43db-88be-8c35f08f65b6', 'anushka.1304singh@gmail.com', '$2a$10$/ozDS.Y9P0vhmh5OBReQRuqzB7SMIFZSV8U4egpiMI/gFxYKuCYNa', 'Anushka Singh', NULL, NULL, NULL, NULL, NULL, '2520014862', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('5a34f7c9-48cc-48a1-b52c-58ed7d64deaa', 'adityanawhal18@gmail.com', '$2a$10$VvmKLTO5q2kOgXbp2zPAPeie7HomiSoWkVLRVhWzwq15Sn1snQ56m', 'Aditya Nawhal', NULL, NULL, NULL, NULL, NULL, '2520020008', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('5a4843c6-4ef3-485a-a022-e9a9107db69e', 'shreyg663@gmail.com', '$2a$10$fx2C5r1M9eL/lNk1TR1vSOURjp52sVNfoaW4GZ7E3iDNzvVCPjuCS', 'Shrey Garg', NULL, NULL, NULL, NULL, NULL, '2520010413', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('5acaf073-fb7f-4ab3-b3d2-a6621ac05873', 'anjalivrana.14@gmail.com', '$2a$10$NbiD5JsZQiWq/E5iOGx8YuZvzmBPGKk8S/yQhTzzSLSM63NlArqXS', 'Anjali Rana', NULL, NULL, NULL, NULL, NULL, '2520010575', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('5ba0f6cd-804a-42b1-8f4f-481e80e6c65f', 'ayushsharma31114@gmail.com', '$2a$10$PD9jevqZscRZH1Sy7pzFteymo.4bX2st/keuDM38YqmpBt1JYBuF2', 'Ayush Sharma', NULL, NULL, NULL, NULL, NULL, '2520010326', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('5c4a337f-be18-419e-ade6-d7a1c5d3a633', 'vrmarashi@gmail.com', '$2a$10$9AjxyCa3QaBmteAGucoTWONil90zdnMqSK2rwa3e.kcVij4dTh6Ue', 'Rashi', NULL, NULL, NULL, NULL, NULL, '2520011189', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('5c9bb05d-02c2-4b6e-87bf-67c23cd5e905', 'jyotsanakashyap.jk@gmail.com', '$2a$10$yaJ3hViMfhuVABbu/GYfHeNPloVRVi9Lywcyd9f3AJIzNY5NnCUT2', 'Jyotsana Kashyap', NULL, NULL, NULL, NULL, NULL, '2520010562', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('5cf186c8-2b25-48cb-a09b-2966de860d3c', 'himanshusingh15102003@gmai.com', '$2a$10$zkm.rHHmN/1s6vLNdH8mQuJE.d/GkLCcux8FYuzJpV8dWsEORB9qq', 'Himanshu Kumar', NULL, NULL, NULL, NULL, NULL, '25201150272', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('5d188cc2-e12c-4fac-8285-f92a09da0b53', 'himanshup8777@gmail.com', '$2a$10$2CXDEAsblPDZev.RNMVE7ef9.ZS7jHEZQak54F6scHv/aRbNXW8rO', 'HIMANSHU', NULL, NULL, NULL, NULL, NULL, '2520010497', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('5df715b7-0cce-4d04-b2b4-8496b1b43efd', 'bhatiyagarvit@gmail.com', '$2a$10$I0r212xLkNxzIN8z5giec.RVf44VtsUzh1tJxeRYu1bONii.YjoV2', 'Garvit Bhatia', NULL, NULL, NULL, NULL, NULL, '2520010711', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-06 12:44:28', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-06 12:44:28'),
('5f2d7cf2-5d21-4925-85ea-1e624bbfae63', 'himanibisht2005@gmail.com', '$2a$10$WRBsTTDgxTFs/XuE9eeHhugRCE8toetWFWjUf6zNcSFaMu79x2suO', 'Himani Bisht', NULL, NULL, NULL, NULL, NULL, '2520010238', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('603e3b7c-b1ce-48c7-841c-955139416723', 'palaksinghal518@gmail.com', '$2a$10$5h9TcOZojEwAWIRsQf8lyONE/YnSrScnhzfWP144dHYj3D/9dtmGy', 'Palak Singhal', NULL, NULL, NULL, NULL, NULL, '2520010030', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('613d6a72-6d65-4dc4-bd8b-5df92790c046', 'armandtea2003@gmail.com', '$2a$10$SSuX21.8jFN21IkPX7VENuQyMcK1CYn7ihx5pR/THjHftQYH/jT1e', 'Arman', NULL, NULL, NULL, NULL, NULL, '2520010676', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('62e7bef4-6ebe-414e-a882-4a2c2215f5e9', 'ashutoshsrivastava9897@gmail.com', '$2a$10$j.MjvjnGOaRnBobMyrXvHO9i.puH8nv6tfVSNEeTdAkvodQhQPjnW', 'Ashutosh Srivastava', NULL, NULL, NULL, NULL, NULL, 'NULL', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('63b7c75f-502f-4bab-8366-2762f17cb711', 'nikhiltrivedi124@gmail.com', '$2a$10$AXUL97LIavrlDrldh0luTu5l9IpHS5HmKqOrl0KbBgyJToURunn/e', 'Nikhil Trivedi', NULL, NULL, NULL, NULL, NULL, '2523080004', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('67d640be-41df-4f76-9ce8-fc35b00e7575', 'd@g.com', '$2a$10$/mvw3ZGzdvptSndPNrHkVOPtYf1wnIUiEPvEepRcYFWr8To.J1jYK', 'd', 'd', NULL, NULL, NULL, NULL, 'demouser123', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 0, NULL, NULL, NULL, '{}', '2026-05-03 07:28:46', '2026-05-03 07:33:21'),
('692fb54b-f287-4628-9af4-f890a6952c48', 'harsh67mittal@gmail.com', '$2a$10$/UyvL98890nAvEMgO5krM.8uuveYpUq7kvK3U58OTC1okDxyiE8pe', 'Harsh Mittal', NULL, NULL, NULL, NULL, NULL, '2520010234', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('69e5defd-db2f-4b89-903e-b14fdd18069d', 'akashsingh4499@gmail.com', '$2a$10$Wvn4oSk5byEYMy9p6gVOlOtp01hwFv4SLF9pi9fX0IwyWQR5bWFgO', 'Akash Kumar', NULL, NULL, NULL, NULL, NULL, '2520010431', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('6a3e7cd7-cd71-441a-ab03-e679fa6d2789', 'ritikakuniyal77@gmail.com', '$2a$10$c7KpU8Ozsi7WCDjW6ujt1eXDFD6z5/SMkv38zoBdDvRDaP9ym1EMW', 'Ritika', NULL, NULL, NULL, NULL, NULL, '25201150373', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('6b492ce6-5143-4647-8c48-044705cbc2da', 'vishal.tomar0107@gmail.com', '$2a$10$Uv8PSDCfxl2cNganfSjCkOw3w3nJYO8Pv1PFiHqMCWZ8p0.7zZF2m', 'Vishal Tomar', NULL, NULL, NULL, NULL, NULL, '2520011119', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('6de63f0e-dd22-4bcc-8273-ccad38082244', 'mayankbisht016@gmail.com', '$2a$10$FjQ3cp7GbCSq.AgxFdPEq.K3XAunxHmy.9TjxzVFroOQrrLU7YE5W', 'Mayank Bisht', NULL, NULL, NULL, NULL, NULL, '2520010319', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('6ea28f74-8857-4a16-9744-502d119788ad', 'raghavkalouni1998@gmail.com', '$2a$10$Hz4HNSQclEQ7zATS2Epmpu3wJj3LABskRlPDi2jaLAOJ48aYRAYw.', 'Raghunath Kalauni', NULL, NULL, NULL, NULL, NULL, '2520010662', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('6f3fe346-ea19-4c25-8969-c8e2bada6b34', 'r.gauravdwivedi505@gmail.com', '$2a$10$W5IHMFv4eMwWyv6/Y6aGe.zfdB/TkLXpHDuyY9jX8ofFXZsc.ho8K', 'Gaurav Dwivedi', NULL, NULL, NULL, NULL, NULL, '2520019648', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('6f448487-baaf-4dae-8a06-4498e79d9e46', 'tyagivani03@gmail.com', '$2a$10$xzBuWQJsXzPq4hOD9Ud4DOollpgbL4Gi7Y3PsUsubJUjRru3F.YYm', 'Vani tyagi', NULL, NULL, NULL, NULL, NULL, '2520010240', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('716914b2-99ce-4d95-add8-eec3ea569915', 'Kashishbartwal@gmail.com', '$2a$10$GuRy67HrROuoWmfDrTjuH.sRcFjVku/PndpEdpD8y1cYeL6ZXadaO', 'Kashish Bartwal', NULL, NULL, NULL, NULL, NULL, '2520020019', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-03 08:52:19', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-03 08:52:19'),
('723e82c2-8976-4a42-8bcc-62fc87c3afcd', 'singhkulpreet604@gmail.com', '$2a$10$vT9PNTe6KLz3S.3NM3XsXeh.4fJOdvktl.tTtKNgip98vJFcsrOaW', 'Kulpreet Singh', NULL, NULL, NULL, NULL, NULL, '2520010448', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('727d5903-f816-4d6f-a629-01fa07c06dae', 'goyalsakshi229@gmail.com', '$2a$10$Z3QDohuA.zs6MRX8mh7dPeRLNrb0JS1fa11ajlfmi5gVembdbpS2O', 'Sakshi Goyal', NULL, NULL, NULL, NULL, NULL, '2520370003', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('728061ba-dbb3-4067-90b2-289043b070ee', 'ishitabisht0906@gmail.com', '$2a$10$l1AE7YD4nv.q75AbpkJsSeAaUxbg41fiQ3rxNlEe4HBbUHlbpxxFS', 'Ishita Bisht', NULL, NULL, NULL, NULL, NULL, '2520010713', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('72b2de23-f16c-4f98-8fae-cde8706e094a', 'mokshmasand@gmail.com', '$2a$10$iNUCA15JBudaTGOjncz5iu1pbdjR2UimV1kklCRexXzpoAs8cp3wu', 'Moksh Singh Masand', NULL, NULL, NULL, NULL, NULL, '2520010202', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('747a702e-2d5c-46eb-ba9e-3432c881eaf2', 'gunjanyadav5070@gmail.com', '$2a$10$a2vA8KavHZFrEtfT4XQF.eQI/oTjtSKsVKmzwfY/jyNcWzEhZgIPW', 'Gunjan Yadav', NULL, NULL, NULL, NULL, NULL, '2520010308', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('74a27ecb-0f3c-461b-a0ec-c2f6d06eeefa', 'mdayyaz18oct@gmail.com', '$2a$10$O/pcHkvedN5sJqsrDFXrLe1PT9fBIzCqaakOHkpop8JPqQn4C3M/G', 'Md Ayyaz', NULL, NULL, NULL, NULL, NULL, '2520010351', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('75130a59-f246-4c85-b91c-5d7ea885ee13', 'roshanakash1921@gmail.com', '$2a$10$C8UgyBogeIVT30d/w8w1vOxcTW.8QbxOLaE/rDE8SabpYkFedkXWS', 'Roshan Anand', NULL, NULL, NULL, NULL, NULL, '2520010342', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('756550e7-028c-4cee-9a91-882eb3b02d75', 'deepakfunny92@gmail.com', '$2a$10$W8pjeKwTtM2FT2p/59kbN.rABPwxrsZNaFYYkj.S73zwKfCL0F5ny', 'Deepak Rawat', NULL, NULL, NULL, NULL, NULL, '2520010488', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('769fd406-6765-4b33-9b60-3cff99b74101', 'saksham032003@gmail.com', '$2a$10$Yw/s4NJGoCSUiYihLz1IBuXUpyGR8SmI8X1LJWR4NAU6J0J2oyG/C', 'Saksham Gupta', NULL, NULL, NULL, NULL, NULL, '2520010211', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('76a587ad-c6c3-4aed-8966-4424949985ac', 'ayushm1222@gmail.com', '$2a$10$i8gIjHt9hBAuKQxlfz/CPeIo2ZPF4YxEKJ9kEmg53d2deiWw8ShVC', 'Ayush Malik', NULL, NULL, NULL, NULL, NULL, '2520010595', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('774c62a9-b3eb-4ae0-ac00-7c8cfabe5553', 'joshiakhilesh10@gmail.com', '$2a$10$Mj8wfFmjRv4TIxT6UkXauuBkCMdIzWR5IfyBiq1ZCqV7tVjP2q646', 'Akhilesh Joshi', NULL, NULL, NULL, NULL, NULL, '2520020049', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07');
INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `profile_image`, `department`, `employee_id`, `registration_number`, `status`, `requested_role`, `approved_role`, `last_login`, `last_password_change`, `is_verified`, `verification_token`, `reset_password_token`, `reset_password_expires`, `metadata`, `created_at`, `updated_at`) VALUES
('777d6ea8-10ad-4795-8f37-798f4400fd11', 'Bhawananegi6900@gmail.com', '$2a$10$Y5unUUpAFSGZwEXxlBOkh.e6AextJFnWWcRvI0lD.iBuYQLbslXzC', 'Bhawana Negi', NULL, NULL, NULL, NULL, NULL, '2520010485', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('77c3aa27-aace-4c00-8c5d-132e7bf22003', 'pihupra88@gmail.com', '$2a$10$NHMAwzH7IrG0ybZenaaeFes3QTqy1z.33OccBoQQ7PsTHywsHg0I2', 'Prasasti Pundir', NULL, '99999 00000', 'https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/profiles/c5f2b755-a8e8-4478-9ffb-9cbef2113196-1777869506012.JPG', NULL, NULL, '2520010348', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-06 12:33:44', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-06 12:33:44'),
('7887f9f9-b1da-4d94-8e9e-1a87a5c0228e', 'ahujag561@gmail.com', '$2a$10$UrvKEtK2i4OmHBYFP1DTv.uvNT1UvMDJsdIlj8E2s/jAETUH1TExq', 'Gunjan ahuja', NULL, NULL, NULL, NULL, NULL, '2520012430', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('7b7a2a2f-4056-4b73-bfd4-1c526a434cc1', 'sudhanshupandey2603@gmail.com', '$2a$10$ObihOGudwrOueMRmkRuWf.MIEPXCnjmbs1WrpgDDBZ0J3T4sVgPh2', 'Sudhanshu Pandey', NULL, NULL, NULL, NULL, NULL, '5143168', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('7d9be8bf-aa16-4203-9312-e5ad36112a16', 'gairola.akansha1998@gmail.com', '$2a$10$l8unvKWdGdT2uep58Eh9v.K.2eY.FfRHpYtCyWL2h.gmIegZKUNrG', 'Akansha Gairola', NULL, NULL, NULL, NULL, NULL, '2520370009', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('7df00945-8607-4c4b-b3d1-379f11a13166', 'iankurdas98@gmail.com', '$2a$10$E36BpqWPOUo03eatrJ4WGeldXohrAQgX.M6.YKpHXL3uGlSKa.mEW', 'Ankur Das', NULL, NULL, NULL, NULL, NULL, '2520010396', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('7f1c52ee-4278-49c6-b3a9-8e4f0d03530a', 'shantanusaxena2002@gmail.com', '$2a$10$E/RVKF0SkdIpU4VI3aKwFeht6izkhv/WnTxk3Vcb4x8vMklTB5GY.', 'Shantanu saxena', NULL, NULL, NULL, NULL, NULL, '2520010207', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('7fcff274-865c-4a31-b639-bf21e8690e35', 'as@g.com', '$2a$10$THjqTKeRKmkmmrA9X5duXO4.2oNLkQTFPOVug/.1S3AWi6tOzXpIq', 'Student Session 1', 'as', NULL, NULL, NULL, NULL, '12222121212221221', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-03 07:34:30', '2026-05-03 07:34:30'),
('807fc3a4-d890-480d-b62d-3de50e9fdb56', 'sraj56501@gmail.om', '$2a$10$PsolFvPFGcy7wkIqnVt6..vpEGZT59tCOWwk3iy2vjN1rzlpxjNP6', 'Saurav Kumar', NULL, NULL, NULL, NULL, NULL, '2520010374', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('81845405-1ed3-4bc4-8940-2ce7c7541d6c', 'anshikakangra777@gmail.com', '$2a$10$C1W6h5oOe2izIqjrusZWReW9E.khrf/TMGSVdhil8p6IZnSK1e5H.', 'Anshika Kangra', NULL, NULL, NULL, NULL, NULL, '2520015242', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('83c631a1-61b0-4588-8f04-e485c6b0c42d', 'anushkaushik311@gmail.com', '$2a$10$h0tnh5btNsv6UtQGGy2./e5iPvatKSt5gQscrheWe952JMXCT6NIm', 'Anoushka Kaushik', NULL, NULL, NULL, NULL, NULL, '2520010534', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('841b8d2f-f763-4d1f-9c2f-6749a97d0b6d', 'sejaladhikari789@gmail.com', '$2a$10$Grb7xVclBD4j.qHjxC6IgeYRdYuzkGMYe2CiB3RvvjeYPI5WqUMHi', 'Sejal Adhikari', NULL, NULL, NULL, NULL, NULL, '2520010344', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('84bdb54c-ca7b-497d-af72-797de824bafa', 'milindpratap100@gmail.com', '$2a$10$ASIzQW9nBURpnYvSkG7KAul.8QfsJd94jJpcrG4sPtWwQLhJdQ8aO', 'Milind Pratap Rawat', NULL, NULL, NULL, NULL, NULL, '2520010363', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('86184ae4-a727-4c04-b455-ab7711370151', 'ansari.anam1012@gmail.com', '$2a$10$T/pFhe4EHVnFptA5kvST.e8dtYP8Gzx3yxSmvmOnset6AaVumR.nq', 'Anam Ansari', NULL, NULL, NULL, NULL, NULL, '2520010667', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:08', '2026-05-02 12:01:08'),
('8688d329-4731-425f-9373-f8f343a41bf0', 'harshitakamboj2504@gmail.com', '$2a$10$f1kvnPHDn5ZoJZ2WFkQt8OCYUMvil/K.3Ja/EAHuX5ZlWSEDVR89W', 'Harshita Kamboj', NULL, NULL, NULL, NULL, NULL, '2520015259', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('87d4c22c-5cbb-4a50-b7a8-2b15fd147d8c', 'joshianjali21042001@gmail.com', '$2a$10$oe2Z1pkZtTGMypgRHF3Ty.QAkVA1/W39x4JUeZNvqrU3TEutUi4XO', 'Anjali Joshi', NULL, NULL, NULL, NULL, NULL, '25201150209', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:09', '2026-05-02 12:01:09'),
('88519ce7-2a4a-4830-8e62-99d2b1b34262', 'bishtshivani143@gmail.com', '$2a$10$gNvJ1hBcr0o1NKOHN4K9MOkcUL2mPEtMcBqzwTvqeuYDO5GfOwKZS', 'Shivani', NULL, NULL, NULL, NULL, NULL, '2520010401', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('88834cb3-0701-4e6b-a634-26c70559b6d2', 'trainer@example.com', '$2a$10$DMUngQTisVq0d6x1GxQdduK6IZcJG4/VlbDTVNic2/arfLLiFDqRi', 'Mike', 'Trainer', NULL, NULL, NULL, NULL, 'TRAIN001', 'ACTIVE', 'TRAINER', 'TRAINER', NULL, NULL, 0, NULL, NULL, NULL, '{}', '2026-05-03 07:08:14', '2026-05-03 07:08:14'),
('8a6a57bb-1076-4add-905a-7f4001e065c4', 'rawatmehak121@gmail.com', '$2a$10$YAQMELxBWpAp.B/Z/2AmY.Pp4fUstAMr.OLd1M9Nhm.j.Nxlkr/N6', 'Mehak Rawat', NULL, NULL, NULL, NULL, NULL, '2520010511', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('8af6d1ac-1704-4062-8059-5552165b6aab', 'pundirashu64@gmail.com', '$2a$10$D3UkfJo0nMfbS8epNCdPLOf9fU7Ug6FW3dlumKkx9jV9eXF8Z1ZWe', 'Ayush Pundir', NULL, NULL, NULL, NULL, NULL, '2520010686', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('8af8fd90-2fef-4b1c-ab69-65e34017f8a7', 'adeeb4ansari@gmail.com', '$2a$10$GBJNMa7/xME9JZNRC9W6dOPaDEJVvJ6Lhwqjk5yjguj3ut8NQOUc6', 'Adeeb Ansari', NULL, NULL, NULL, NULL, NULL, '2520020041', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('8b8e749b-6797-4d74-8cf9-f1bb092b11a9', 'rupeshjajedy@gmail.com', '$2a$10$5CC29ZRLXt2ULVhtacxPhOkruZ8OgRFhZLas0WhrKt7OfgeCYzZdm', 'Rupesh kumar', NULL, NULL, NULL, NULL, NULL, '2520010466', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('8d2ee3ca-d2a3-40a3-8c24-c6d602718880', 'rajlakshmi8873@gmail.com', '$2a$10$6c9OVv3EWBNcMLItIJ.u4OP6D13h3f8dcMjYT2FVBQX0wxTbgwK1C', 'Raj laxmi', NULL, NULL, NULL, NULL, NULL, '2520010086', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('8daf0158-3616-42b9-be00-06a31b9dad0b', 'faculty@example.com', '$2a$10$bYwjE.pcac.GCEj4todNwe/ZWEboFtmy2EPKCbxz3YdD1lyqrXnEG', 'John', 'Faculty', NULL, NULL, NULL, NULL, 'FAC001', 'ACTIVE', 'FACULTY', 'FACULTY', '2026-05-03 07:08:30', NULL, 0, NULL, NULL, NULL, '{}', '2026-05-03 07:08:14', '2026-05-03 07:08:30'),
('8e96a792-8aeb-4b54-af68-e7d51622f5aa', 'tiwariishita04@gmail.com', '$2a$10$2HvLHHmF2KiXGVyckoolv.yJ6vNibNDt4xTamRB5AwWmocklg5izq', 'Ishita Tiwari', NULL, NULL, NULL, NULL, NULL, '2520012028', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('8ea61ee4-c4d5-4f0e-b8a2-47d8d2cc9102', 'nishugurung08@gmail.com', '$2a$10$e.Pu5zCwpyPkhMi1uJQ3YOOsXUYrFyMXARzgmtOMy1aA8jP7raT72', 'Nimesh Gurung', NULL, NULL, NULL, NULL, NULL, '25201154436', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('8f09f314-472c-4d5f-9cbc-e2668166c8f2', 'rawatsimran40127@gmail.com', '$2a$10$RE3HZDnWS.SQDhGHM.ApbOlovBOaUsp8cq2DtSachgioGk67UCl2W', 'Simran Rawat', NULL, NULL, NULL, NULL, NULL, '2520019769', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('8f6f28bc-7ce1-40f4-9430-2f42cdfd6441', 'saurabhkathayat61248@gmail.com', '$2a$10$QWCQbMsCvTrG4xGQSYkSL.vLheB/qGY/2McwopbbpVYpvJvtHKsTu', 'Saurabh kathayat', NULL, NULL, NULL, NULL, NULL, '2520011082', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('900b6fb2-e61b-4b7f-937c-e186a739f336', 'piyushj7037@gmail.com', '$2a$10$zBdFdl6hyfgCaXeQq7QbduxbZKrqBJG6w4qenX.E4NxJhdkI7pCZy', 'Piyush Jain', NULL, NULL, NULL, NULL, NULL, '2520010617', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:08', '2026-05-02 12:01:08'),
('9254b05f-ab99-425e-b8a8-f5290e46dad4', 'skandmamgain1@gmail.com', '$2a$10$Ph1OmHrf9RqO103Mjn.Xt.7gA/JRL2zs0hOFuHuc55mxEi8bNSj4a', 'Skand Mamgain', NULL, NULL, NULL, NULL, NULL, '2520010306', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('94652bdd-4789-48f1-a37c-fca77703bdfc', 'faizansaifi2110@gmail.com', '$2a$10$jqYpdSneQy/ZFlCsohyX5ubcGVFrxoRjtk8SJgyDS.vHW.mnk1Vlu', 'Mohd Faizan Saifi', NULL, NULL, NULL, NULL, NULL, '2520020461', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('95e8c3fb-d09d-41da-bf1c-96a308a0d85a', 'shraddha.sharma0803@gmail.com', '$2a$10$aKeI.g.rf27UZCScRmfJh.boVMLZVJzUNfn5HMeEI3u35M2Ezhf7O', 'Shraddha Sharma', NULL, NULL, NULL, NULL, NULL, '2520016259', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('99b18f1d-cec5-4300-aa2b-ba88971dffaa', 'manu4740w@gmail.com', '$2a$10$Z8nB5oIG8XlFhagV7cjKw.mYQtXNPYMDJ6lfFKkIfjlXSbu8zfhyy', 'Manu Yadav', NULL, NULL, NULL, NULL, NULL, '2520013438', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('99cea1b5-8dbc-41a6-9eea-762172180311', 'ayushibisht800@gmail.com', '$2a$10$q8NrcBVJdXJuO.lPpaYcyeh5JeFNEKccWI3A79lFO0TYAYSVyKbZ2', 'Ayushi Bisht', NULL, NULL, NULL, NULL, NULL, '2520018122', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('9be92367-bded-4667-b719-31174f95eb6a', 'thakurshaurya580@gmail.com', '$2a$10$2ngNXb02r3y.YXakIW5apuHMwK.iIzrA8Dl59H8pQ6x04smNZcXMK', 'Shaurya Pratap Singh', NULL, NULL, NULL, NULL, NULL, '2520010445', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('9bed1513-ef54-42b1-a2dd-1634e8bfd063', 'sajwanpriyanshu37@gmail.com', '$2a$10$ZXzR0umtjpefeSoElbCUieXdBB2SrsJCRIum1Y8OLSGLjzhWRRZLe', 'priyanshu Sajwan', NULL, NULL, NULL, NULL, NULL, '2520010404', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('9e54f251-337a-4744-8532-d8b9414eccfe', 'ankitnegi9411535325@gmail.com', '$2a$10$ouSTzU7wuGGAeU8og1Kaz.XwNx5YRctgtUqDJQ4A1e2mAdzLXN2ci', 'Ankit Negi', NULL, NULL, NULL, NULL, NULL, '2520020039', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('9f8783e5-8cc5-40e2-bcae-54561ff24f8b', 'vishakhasaini37@gmail.com', '$2a$10$2ZRUkjduVLNQyuEkYXsfyu3P0hVNnAQ.hkpNAzShhW4UF76l66Tjq', 'Vishakha Saini', NULL, NULL, NULL, NULL, NULL, '2520029071', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('a06346af-512f-4e2d-882a-942339eb1da9', 'aditipundir001@gmail.com', '$2a$10$6GkzLxn9J7PF99WGJOGWU.vM7tXO5Tg5yZD7FHHKh3X8QKdI9y4qm', 'Aditi Pundir', NULL, NULL, NULL, NULL, NULL, '2520010584', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('a2775b55-1e37-41b9-92b7-e0641823f076', 'jatinpunetha85@gmail.com', '$2a$10$oCd6vFYB0eqPr.APy8hx4u5726i.Z782sQd0242W7QTK5RT.83gRS', 'Jatin Punetha', NULL, NULL, NULL, NULL, NULL, '2520230102', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('a35dd8be-bc69-4621-88d7-89465a5c06ec', 'radheymadhumahe@gmail.com', '$2a$10$PYpcExFD14yJp1zbqtT.juZA2AnFP/vBNNUO8iTw4DF0UfSk6vwku', 'Radhika Maheshwari', NULL, NULL, NULL, NULL, NULL, '2520010480', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('a3cfd764-98f1-491c-b61b-9dc01c6658fa', 'irabhardwaj7717@gmail.com', '$2a$10$3/UVQBci0A.Q98SRTafPneSsfT8tEUSfzASfYRGJIPUDvd/q8fp2a', 'Ira Bhardwaj', NULL, NULL, NULL, NULL, NULL, '2520010440', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('a3dc12d8-4141-4119-8e34-a0789a8f6ccf', 'anushkagairola2020@gmail.com', '$2a$10$FuxZ2kO2mLg/19U9z.4sJed.UCXSMqbx1QeOnj5mghPKPFOxzaUfS', 'Anushka Gairola', NULL, NULL, NULL, NULL, NULL, '2520010071', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('a40e0e94-6663-4654-90fe-4bb4190ac922', 'snehilnegi710@gmail.com', '$2a$10$cMFhbboFwToM89jEF.70mOJtXVpWfJHEzdE5Omwf9qZ3zkRS/RhJO', 'Snehil Negi', NULL, NULL, NULL, NULL, NULL, '2520020162', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:09', '2026-05-02 12:01:09'),
('a465e258-1900-4455-a83e-d89727982259', 'rashikabhardwaj110@gmail.com', '$2a$10$aJv6iP55aJOYKld.NNwx3.xtafOJ1UUyr0AKaS0Ad9FV.FWm/CBZq', 'Rashika sharma', NULL, NULL, NULL, NULL, NULL, '2520010077', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('a4b2ea94-42e2-46c1-8327-25da50ceb847', 'rawatabhay407@gmail.com', '$2a$10$Gg7ME8l3llPaIhCNdQmWnu27p7CUTtC2E1XHxviXLrdQURUtpsJvG', 'Abhay Rawat', NULL, NULL, NULL, NULL, NULL, '2520020048', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('a4ffa118-83e7-4916-b43e-328378e121a3', 'vinamra.abhi@gmail.com', '$2a$10$Qt1L0SP0dnpzLDYqiLhU0OEXXw2n2zKgURGn3KLwi.30nBAZ3aESO', 'Vinamra Chauhan', NULL, NULL, NULL, NULL, NULL, '2520010443', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('a62230f7-e26d-4815-b0cd-62cbc2503d36', 'thaparonit717@gmail.com', '$2a$10$s5niMg5kqX7kJZ8tBdz3YuuDNnHl.rZ6gSctZS8TF0w8Cd45sV1iq', 'Ronit Thapa', NULL, NULL, NULL, NULL, NULL, '2520013338', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('a6b62b9a-195e-4ecd-a8cb-ce5e8ad1a710', 'ayushydv010@gmail.com', '$2a$10$tDi/UcrYBI7UERuK6N7GY.Odsf3RJmx5KuKqVmeaQ4m.RE9d5N/LG', 'Ayush', NULL, NULL, NULL, NULL, NULL, '2520010412', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('a75a064a-c00e-435f-a2e5-bfb185671494', 'pantpriya02@gmail.com', '$2a$10$twEzCLsMd08E6m7zIHFFL.h.LrRhr7BiLQew7aXJP32GfQkZExqYi', 'Priya Pant', NULL, NULL, NULL, NULL, NULL, '2520020165', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-06 11:45:48', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-06 11:45:48'),
('a7912047-86d3-49a4-8388-6c20fe8357f1', 'yatharthpande30@gmail.com', '$2a$10$25N23VkY0ZqITI0qVd4ujubbK3cYDqMvSfjNC5mW2YrEXUpEuqW6m', 'Yatharth Pande', NULL, NULL, NULL, NULL, NULL, '2520054359', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('a94d70dc-dc91-40bd-b7d3-bf0e1ffa3ef6', 'demostudent@gmail.com', '$2a$10$YmJSJQ9QrtuUmdrBjwDknOI6CJI.ySdx8OSO.Txz1M52y3lu2WTJe', 'First Name Last Name', NULL, NULL, NULL, NULL, NULL, '23022222222', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('a9b08bbd-de63-48f0-b931-8f679df0afb8', 'anupamsingh2639@gmail.com', '$2a$10$tii44MHiC1DfbU0iXbtthe6pD816C8bQ2zj3qAZQhllEi20NyADSK', 'Anupam Singh', NULL, NULL, NULL, NULL, NULL, '2520010683', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('aa28398a-25d7-471a-a2de-a0e2b0b3d5b9', 'singhshaurya970@gmail.com', '$2a$10$Qfzu9cP1Wgmy3QVXj/hoQufNPbceHySay5UGfMzY9Xu/hjONjy/0K', 'Kumar Shanu', NULL, NULL, NULL, NULL, NULL, '2520010098', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('ac0dc64a-b51f-4862-a539-dd563e84dd98', 'jainmanvi081@gmail.com', '$2a$10$hOlTAnyfjp/ibhpfbsg2MOdfSUVc4IcXcql5Ywgp4Gbyohc12dL.u', 'Manvi jain', NULL, NULL, NULL, NULL, NULL, '2520014286', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('ac54be9e-bd35-4c83-a6d4-c55101fdd980', 'thaplikajal7@gmail.com', '$2a$10$t9aTv2ptZQuavoAG7ze3xOZM6R4I/GogWqRP2CLhySrKXWYktBv4i', 'Kajal Thapli', NULL, NULL, NULL, NULL, NULL, '2520230417', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('ac6c0738-861b-419c-bfa7-9b6880258ad3', 'bartwaladarsh2003@gmail.com', '$2a$10$hXkhDwBuxsCCTZPWbfVhA.EFcLLL7I5ITeni9toMw2QkDDk9Fl/uy', 'Adarsh Bartwal', NULL, NULL, NULL, NULL, NULL, '2520010422', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('accdcec4-7146-41b9-b1ff-75923fdd7f37', 'shreyabatra018@gmail.com', '$2a$10$BfwhHuhKjhAvOpEPoy12puuJO3SFdOV9aB4csdR1bHCyw56RRqtpu', 'Shreya Batra', NULL, NULL, NULL, NULL, NULL, '2520010350', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('ad0124b8-01d5-4b21-8266-f777b4978060', 'priyatomar07oct@gmail.com', '$2a$10$7fLvRV5JVAzSgBKMHwa95.NQ5Q2HNBZiureH02OoWUI1.hUMNNkB.', 'Priya Tomar', NULL, NULL, NULL, NULL, NULL, '2520010239', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('af9cb890-d215-4e08-a416-0236411277a9', 'rnegi7434@gmail.com', '$2a$10$cuqHXw8bwNMO6hfiaiMNOOFPTHDfW11rvUsmgg7PNJc8ppsPt0PVu', 'Riya negi', NULL, NULL, NULL, NULL, NULL, '2520010318', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('afa6e0a5-d26b-4e95-8414-25c350ed587c', 'albexchongtham@gmail.com', '$2a$10$YGu3GozOHWMNK2CwIctnVuNo2OW3.jmvndE.XJLJRvF8c/lh4tg7G', 'Chongtham Albex Singh', NULL, NULL, NULL, NULL, NULL, '2520010263', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('b0916e29-354c-46c5-a457-ff82c1e11793', 'navjotmakkar21@gmail.com', '$2a$10$ZmqwrkyQO3VgUqSbvBPoZ.MhtboCct5rL/ApE/uRk67bKPZaIhrjG', 'Navjot kaur', NULL, NULL, NULL, NULL, NULL, '2520370008', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('b0f2ff15-0bfd-4a41-9028-3fab081d091a', 'anjalimahara64@gmail.com', '$2a$10$Q8DeCK6R/3kEzYFI/cJr3eQJ0gD07nHzI7B7dyaN9mgHscnoLtHPa', 'Anjali mahara', NULL, NULL, NULL, NULL, NULL, '2520010498', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('b1188f54-597b-4f83-8b2a-7333165bab2d', 'piyushjoshi1sep@gmail.com', '$2a$10$.pvcceELMJaYGKTgQiZhPe9zX0zT6lSSwlOmFGq3G7kk5TLdQYYW6', 'Piyush Joshi', NULL, NULL, NULL, NULL, NULL, '2520010430', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('b18e7ee1-745a-4929-8e13-d21a1b0169fb', 'admin@test.com', '$2a$10$h1WitH9hao0r4HOiUBF7oeNBRCGXuls9t.dvX0G5l37rPUsuZbp6y', 'System', 'Admin', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'ADMIN', 'ADMIN', '2026-05-06 09:56:54', NULL, 0, NULL, NULL, NULL, '{}', '2026-05-02 11:58:17', '2026-05-06 09:56:54'),
('b1bc4023-c0df-43ad-a4fe-3d4c9d09891d', 'apoorvadubey421@gmail.com', '$2a$10$TSXRJrLWLPD2w4NuFaxwdu/Skh/Ahkp5NcMAMSmwt3j3Plc7aN8ge', 'Apoorva Dubey', NULL, NULL, NULL, NULL, NULL, '2520010510', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('b3215b11-bf46-427a-9869-166ac7fed354', 'bpriyanshu794@gmail.com', '$2a$10$xvtliTVXqjvd9qJjc3q.2ucEDh2M5XwlnDkRr71bjdIQukH/Yse2C', 'Priyanshu bisht', NULL, NULL, NULL, NULL, NULL, '2520010432', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('b3341a73-f42f-41a4-8a28-62ea2c656805', 'shreyabajpai198@gmail.com', '$2a$10$a3uhVQA4/38yOTwnuAfavOl10iz.HxRqxkOuoxmf9aE2npHyx1F1y', 'Shreya', NULL, NULL, NULL, NULL, NULL, '2520020014', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('b360f3cb-e549-464a-b585-4a65b0dbce4f', 'tiwariayush7487@gmail.com', '$2a$10$Ev8qzVvBW4ldmq7cchNPxe9iIoGJU1eYPTvWdIbK5vUN1zxHlFu3i', 'Ayush Tiwari', NULL, NULL, NULL, NULL, NULL, '2523080007', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('b3f5e9ab-7246-4dcc-9f47-d629b5c1faf9', 'jainprateek25122003@gmail.com', '$2a$10$bWUJIzC22MiPyeTDWJN7auD.0jEtx80r4nnyNizutMJ9KvbqkARIy', 'Prateek Jain', NULL, NULL, NULL, NULL, NULL, '2520010458', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('b5577021-6324-4e26-b4c2-db991f97b22a', 'hgandharv69@gmail.com', '$2a$10$dS1Rd.r7G0y/m0T57tZ98uYyujY3lB6CaVcEgbF8RCJ01o2X6YZRy', 'Himanshu Gandharv', NULL, NULL, NULL, NULL, NULL, '2521090019', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('b5bcce32-053e-4c8b-9ff1-b3b91d7ce6d2', 'anushkajoshi684@gmail.com', '$2a$10$OWqy7ZStnbB1lKnxWFyymubG6K/heE6UdaH1wMuHg/mHIlAPxKpsy', 'Anushka Joshi', NULL, NULL, NULL, NULL, NULL, '2520010547', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05'),
('b61c12bf-abfb-4dad-b652-7b3bbdb3d013', 'manikagoyal3@gmail.com', '$2a$10$//9B9aokxDZjfQDjdPaOsuKoDVDoCbtsBFs0O0Wui5D7i6f74GEfC', 'Manika goyal', NULL, NULL, NULL, NULL, NULL, '2520010230', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('b6b26d3d-6d53-49b6-879c-f1f8f22a5dbf', 'anjaliyaadav9419@gmail.com', '$2a$10$9XCpJd07SnH3PloEcMH4c.hHMoyrG.cyBEh.CQFlJxPkVzpz7GnvW', 'Anjali', NULL, NULL, NULL, NULL, NULL, '2520020005', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('b8346b37-674c-478f-8227-077160311fd4', 'krishnaverma072001@gmail.com', '$2a$10$kepupxS6gNULHkuICaobrOYu7FEeOnG0fG5cPmVwrYvQ9ftQ309fq', 'Krishna Verma', NULL, NULL, NULL, NULL, NULL, '2520010166', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('bae758df-07cb-4e2a-995b-ea9c8e00d3ef', 'khushisinghal095@gmail.com', '$2a$10$NMt1ppd969/aPBwRqX1gsuP5z0iUYBF1do/8lVLYfWUbnu7NF01RG', 'Khushi Singhal', NULL, NULL, NULL, NULL, NULL, '2520010461', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('bb2eb144-88e3-47d0-9035-7eab2579b801', 'maruti6204@gmail.com', '$2a$10$63LgMTSV4Nf8DUf8c4wXDO4/N4/5eyVXslC/ineXUFpBXQvHGARhC', 'Maruti  Nandan', NULL, NULL, NULL, NULL, NULL, '2520020031', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('bb40abff-9aca-4150-b647-116d4967a414', 'vrindanarang22@gmail.com', '$2a$10$rOxyAEUCqBfGLzAg8tGxrO0sBGDAmTfWLIu..U1Kaq8ReBvg1pjg2', 'Vrinda narang', NULL, NULL, NULL, NULL, NULL, '2520019467', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('bca555ac-a6d5-4acf-ae2f-a3fcc1dca6b7', 'namratasuri2004@gmail.com', '$2a$10$NvsNVsHnOubFes5u4KxpeuZ0WOVyFp3xvgBpidzAXQsl3G9BLBCVi', 'Namrata Suri', NULL, NULL, NULL, NULL, NULL, '2520010668', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('bd6c0734-e2bb-4ea7-8e00-33886f6db927', 'tanmaiickoo578@gmail.com', '$2a$10$fN9t6HmDEp7f3Jeqi8ddV.gS0kW8v55RpT7lGTc2C.hpiQUE0hhZy', 'Tanmai Tickoo', NULL, NULL, NULL, NULL, NULL, '2520020030', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('bde27659-e5a9-4907-a2a8-cc13c6da6fa0', 'vedanshkothari20@gmail.com', '$2a$10$NSFnL8ig3twsM0LxJ/.S9esdIaHOW0u9AXxO1u/bMs2ZW7SfHBMiq', 'vedansh kothari', NULL, NULL, NULL, NULL, NULL, '2520010273', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('bea280f1-bbc4-4289-b878-c2ba0b8b445d', 'mconradroy@gmail.com', '$2a$10$RoX9h6PXYbu6Y5JvECq1hOqLy1XhMWH0oX6sdL//DQN8liVyAuPLm', 'Mugagga Conrad Roy', NULL, NULL, NULL, NULL, NULL, '25261002', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('bee985a2-03b5-4666-a8b4-b5ae65283220', 'shrimadhu1965@gmail.com', '$2a$10$avjxTCYvJoAJm7I0kXnqJOryxM4wx8XTm5E6I.ILcnTD7FfRxlfjy', 'Rishita Kumari', NULL, NULL, NULL, NULL, NULL, '2520370001', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('bf27dd9a-6e71-4fcf-8c96-85ca868e1128', 'krishna2021gupta@gmail.com', '$2a$10$zdI3fTSVvtibWvpf7eqbxuB8TMtNzz4tPKbc93oe/Bm2uVXEewJ36', 'Krishna Gupta', NULL, NULL, NULL, NULL, NULL, '2520010120', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('bf3298b9-e7e5-4b0b-a4c7-638abdebaffc', 'ayushisainioct25@gmail.com', '$2a$10$vh1o6s0qGh/8Ckn7lsZASeAenm./iqA134Bs2XplUysiOU0bSudAq', 'Ayushi Saini', NULL, NULL, NULL, NULL, NULL, '2520015372', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('bf4f2373-144a-4eb9-b601-5cdebd2a2ab4', 'vinay.basera1304@gmail.com', '$2a$10$IOC6toZCIUP00fNNQJyF..U3Br1V9hGyuqjp4pv7etWA/j/VK16zu', 'Vinay Basera', NULL, NULL, NULL, NULL, NULL, '2520010570', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('bff7ebbe-44f4-437e-a0a8-06d22c577ce3', 'vidittarar0777@gmail.com', '$2a$10$TbwFB0I.gkRsLe3nmZK.X.llnuFNcjeZmifxcWMpaiqGM/lX2kTwK', 'Visit Tarar', NULL, NULL, NULL, NULL, NULL, '2520010535', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('c073744c-8862-42ab-a604-13071c5b9575', 'anjalisobha9@gmail.com', '$2a$10$5l39lvR8ueQgSyTQhSBwNeE1nD23AE1TntRvsCWJZdkUft.4.uGZG', 'Anjali Kumari', NULL, NULL, NULL, NULL, NULL, '2520010434', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('c12e0340-7079-46e3-9b28-6e400c46e032', 'rajkhaiwal001@gmail.com', '$2a$10$ygNRpCEPUqWr/0mpfTmhh.MsjuSRuegEUcmGFz7xFN6SKJKygpD8C', 'Raj Khaiwal', NULL, NULL, NULL, NULL, NULL, '2520010128', 'ACTIVE', 'STUDENT', 'STUDENT', '2026-05-03 06:18:45', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-03 06:18:45'),
('c15200ee-d10e-4fa7-a16a-f1e42374f782', 'yuganshgola7@gmail.com', '$2a$10$F6GQdex6DSF/wyVEiNcwd.HoFZHqrdeVMi69EJF/.GdAy.igaGJ8C', 'Yugansh Gola', NULL, NULL, NULL, NULL, NULL, '2520010555', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('c1f32d18-682c-4332-9556-b68a449a5711', 'kushalkishore1@gmail.com', '$2a$10$aFKE33XThn2UnTUbMe8sG.8s0oB6nQTpugW9DIO2AVkpwK6eaQccq', 'Kushal Kishore', NULL, NULL, NULL, NULL, NULL, '2510470057', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('c205a33b-a7f5-4597-b557-7195015d8719', 'raghav2005jjr@gmail.com', '$2a$10$WQh.4fuhozxaxBtYEcnCm.Yrx5Z2GEtB5EHY5sTgbdnphoXZghb66', 'Raghav Ranjan', NULL, NULL, NULL, NULL, NULL, '2520010272', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('c21d3853-a324-4d5a-9350-1050716d97ea', 'khinchi.priyamvada.2854@gmail.com', '$2a$10$llEB1A3ra.4pxPzyeucEquRF2Wt1vsV3hQckTvxmFA9epmxQgBWyC', 'Priyamvada Khinchi', NULL, NULL, NULL, NULL, NULL, '2520019863', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('c25aa6dc-3a34-4c86-8501-2f661551bb12', 'sakshamnegi9@gmail.com', '$2a$10$JLmrEmxNLyYOnqb3Y4k8depYUo.c3dAZj6uFM1msknd2/q8Q/jZvO', 'Saksham Negi', NULL, NULL, NULL, NULL, NULL, '2520010594', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('c3cde8f7-6215-47ce-88a2-5958d61ac102', 'sarthak0516@gmail.com', '$2a$10$DihrJvYiiHbXYmwQvoXoRe78fJmjFWa.iaO4yJuWLV8joUexzc7Sa', 'Sarthak Rawat', NULL, NULL, NULL, NULL, NULL, '2520010297', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('c6517000-2579-4182-9ab3-065a0ed318c0', 'zaara41235@gmail.com', '$2a$10$UZA5rUmG8galrEb9c2/I/uvyv6yUn.xuSm/uB07lbFeIfgxnlZWDu', 'Zaara Azhar', NULL, NULL, NULL, NULL, NULL, '2520011892', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('c6ec43c3-361f-472d-87f2-44fe45d6fb1d', 'kumarlavish095@gmail.com', '$2a$10$s6PfSLlSIv3nDY9A94NQu.NyTfEAozlWzAa4CsVXptcHGL1lJzRXG', 'Lavish kumar', NULL, NULL, NULL, NULL, NULL, '2520010421', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('c72d8ce9-a910-4edd-9304-2339e266663d', 'ashishchoudhary2414@gmail.com', '$2a$10$EsaoT.qxi/ch0ZHJvmZzsO.LFNyd/2IU74.1cNipqwAr0B04/U172', 'Ashish', NULL, NULL, NULL, NULL, NULL, '22091331', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('c856c723-c8f4-4ea2-b65c-21e6e1c8e368', 'ritikrana89166@gmail.com', '$2a$10$BMKUfnQ8Br87uOi47K.K5uD.lYAxcAXNcc0f8/sVTuRyb1KUn8WOC', 'Ritik Rana', NULL, NULL, NULL, NULL, NULL, '2520020042', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('c9615ed6-3214-4cfb-bb06-941170a45e09', 'adiityasharma5@gmail.com', '$2a$10$bLFCiBIL6k57ut5dEidexu460vJeKf5B2ZYBQi9Pn1L0wftFId6ke', 'Aditya Sharma', NULL, NULL, NULL, NULL, NULL, '2520013558', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('c99f8bf6-e7fc-4d33-9328-07831ecfd019', 'bhatiap0206@gmail.com', '$2a$10$8iXad5wbWGGqnkbExxtpEO7T/JRHm05kqTB8BOlqhCIMr2N7hbzbC', 'Priyanshi Bhatia', NULL, NULL, NULL, NULL, NULL, '2520017289', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('ca1a9326-1180-4b00-86d6-3cd3facd9165', 'dhakashristi947@gmail.com', '$2a$10$jv.YCyehyZnYH4c4Y36Pyu0.aWA3yRR7Uo4XLCjIkKip/nEWPYmW2', 'Shristi Dhaka', NULL, NULL, NULL, NULL, NULL, '2520040005', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('ca2f6e5d-4ef7-4529-a9dd-ccd3b74846f1', 'raziya.dun@gmail.com', '$2a$10$IPqAdGbTdNIDDaozoLFhh.GHrZpMgwsNfHFkFn2Oit9hh9r1wH0bS', 'Raziya Ansari', NULL, NULL, NULL, NULL, NULL, '25201150341', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('cb28688a-6991-4209-96d3-3b4aa4518319', 'anmolsep15@gmail.com', '$2a$10$TxwqQFZ55EGT5/9X56bg.uUAbTqdYvqO39re57Rjxpy9dnG0YEtHm', 'Anmol Gupta', NULL, NULL, NULL, NULL, NULL, '2520020025', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('cb557657-eb5b-476b-bfe0-0ed3d39a33a6', 'gauravbisht2803@gmail.com', '$2a$10$pFtulAw4DIxLf5zc6lr/xODKoQiFu43fPKdezqrs24CEU1zpMyZkS', 'Gaurav Singh', NULL, NULL, NULL, NULL, NULL, '2520010243', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('ccb45f08-32fb-4b13-8871-4693025884aa', 'ojasvi.tyagi2024@gmail.com', '$2a$10$uxEqUDrZwDnS0aET5LoRoO8gxzSzVjSqK2EPEcv92G4/ohXxbmYKC', 'Ojasvi Tyagi', NULL, NULL, NULL, NULL, NULL, '2520010113', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('cd27c3ca-d9ff-4607-85df-051fa820f90f', 'sk3790992@gmail.com', '$2a$10$peWRzootOczREfYRw8cTsOjWnhW8Rzf1zqZDqaaS80iVuX8H9nqSG', 'Satyam kumar', NULL, NULL, NULL, NULL, NULL, '2520010464', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('cd7f2f5a-0bae-4535-bfc2-30fdce97cf85', 'rahuldhariya02@gmail.com', '$2a$10$7Vn/Uek955Ec7UVd.r/kG.ZaCHX6LMwyKIxrBSWaK5wp/.0COJTK2', 'Harsh babu', NULL, NULL, NULL, NULL, NULL, '2520019689', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('d48823f9-2a06-4a2e-8f7e-475c4f64bf6d', 'aanchalkunwar1679@gmail.com', '$2a$10$rwiKCpf5P5AYlhDORfO2/e9xzo1x/3gBrUj.gCmcysrBPjJsUodDO', 'Aanchal kunwar', NULL, NULL, NULL, NULL, NULL, '2520015634', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:57', '2026-05-02 12:00:57'),
('d56bb123-954b-4266-929d-13fe935b7c91', 'ashukant1111@gmail.com', '$2a$10$59RJ6OKX1WZnUPplh3VgbuAX38wg1z0.7SJEfQ06tIuAlOe3le.F6', 'Ashutosh M Kant', NULL, NULL, NULL, NULL, NULL, '2520011719', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('d66b6189-0ace-49ff-85c5-ebc5736560fa', 'hkhansika2002@gmail.com', '$2a$10$oP6GzLZ3Dl9zW5dy/vfQt.XYYh6/pXnROseS2fmIvYI4eOrnm2CUi', 'Hansika Kumari', NULL, NULL, NULL, NULL, NULL, '2520010446', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('d7f40417-ab6f-4ea8-8175-be8d745e8354', 'siddiquiayan268@gmail.com', '$2a$10$/w/MpeRApGKVoKxfOjJmS.wO7eK3HZJRz0DoQ/ENDzCEJhY0QHahG', 'Burhan ahmad', NULL, NULL, NULL, NULL, NULL, '2520010153', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('d917e5cf-aa68-4c7e-ad51-8a24cb5d403b', 'umarrana8852@gmail.com', '$2a$10$fPogI.x9hPvdQApNxO9Vl.3cxPHzNIl04l0jatRowRVLitidtSz1.', 'Umar Rana', NULL, NULL, NULL, NULL, NULL, '2520010652', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:08', '2026-05-02 12:01:08'),
('da036d27-b166-4f88-8536-4609caa6ee18', 'yashpundir316@gmail.com', '$2a$10$5cIElQUIJOoRdCrQWX90k.1Db5jI58cfT4WiwUO8fLgM6looZWBeW', 'Yash Khatik', NULL, NULL, NULL, NULL, NULL, '2520010520', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('dadc2e5a-6a55-4e19-b306-04462c6dbbfc', 'mahartarun366@gmail.com', '$2a$10$A/ZE.OLCHw1syGzi0/yhLuKGvJhpdCLUGmNowiuV6Jowny8Hoga6i', 'Tarun Mahar', NULL, NULL, NULL, NULL, NULL, '2520010574', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('db97c5ba-deae-4a1b-b19e-18e1788522ac', 'rishabsonkar48@gmail.com', '$2a$10$LwV/zmpLBRp0tDo2ac08ku0zVs5it8ZAQnGPTt7YsW/Z9L.2zZrsu', 'Rishabh Sonker', NULL, NULL, NULL, NULL, NULL, '2520010538', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('dbcd064a-6b21-421e-a980-047d9291995e', 'khushikas22@gmail.com', '$2a$10$/lnFf1rg5bnoZVKhEbEc3Op2bYMwAy71aUwlON0S6Vxb0cn/uqGyK', 'Khushi kashyap', NULL, NULL, NULL, NULL, NULL, '2520010325', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('dc321283-a7cb-41a1-ae49-2f9541af07db', 'sayakkundu25@gmail.com', '$2a$10$8kAz4DGCTutByT3mH0PweetYevh.dMLCi6CVvc/vlrRZvUJMz03FO', 'SAYAK KUNDU', NULL, NULL, NULL, NULL, NULL, '2520013781', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('dc827f00-569f-4e62-9d68-a9a0e200164d', 'gupta.kanak2425@gmail.com', '$2a$10$jrDDpAEz8u76jeKPmkneOO02QKH5tCjR1viFe2GGwdgxVjZStBdn6', 'Kanak Gupta', NULL, NULL, NULL, NULL, NULL, '2520010264', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('de2777b4-4ac6-434b-bcae-d9a548f5f707', 'nkhushi21@gmail.com', '$2a$10$x.ZXpYVX6UHIcVlN92YFhOeRajbUl/7xUvwOTT5WctWRr69HFJDxi', 'Harshita Negi', NULL, NULL, NULL, NULL, NULL, '2520010048', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('de473ae9-e128-4238-b572-7d1e7b255c3e', 'krishnasinghnegi11@gmail.com', '$2a$10$qlAgtXAU.pZxRkuVy0SiM.qE5rGlXusB/nMyJ7G76NH3MXvpeXycS', 'Krishna Singh Negi', NULL, NULL, NULL, NULL, NULL, '22041318', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:49', '2026-05-02 12:00:49'),
('de61c4ae-9c1d-45e9-b4a8-2cceace942de', 'anjirawat29@gmail.com', '$2a$10$e7GWW2HemU7MuyJQQC69cO38b3CjXyK8Q2n5fZks3unMDGJooVTyC', 'Anjali Rawat', NULL, NULL, NULL, NULL, NULL, '2520019027', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('dfe21d1b-7561-404b-99b2-f0203c940eeb', 'nia.108nandini@gmail.com', '$2a$10$1/RHBe.NNhxMsaAVh6sRrelte2jVYlfJZBwFYLTarljmMzPCL3fHq', 'Nandini Pandey', NULL, NULL, NULL, NULL, NULL, '2520010661', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:01', '2026-05-02 12:01:01'),
('e0ab1007-377b-4931-9aa2-4b8d4a582c68', 'paltanishka61@gmail.com', '$2a$10$S/zVV04Mo4EL1GaKauMTsO4s5xoWM9IWg6dZyXksLh4oWuPYkJy8i', 'Tanishka', NULL, NULL, NULL, NULL, NULL, '22182097', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('e243d3cb-df05-454a-b228-9619586a4b2b', 'riya1.dr14@gmail.com', '$2a$10$StK3DF85GTZIM64CpuvD2eNa67X5uZXzT2PXFDngBKXecWRgIJAmC', 'Riya Dabral', NULL, NULL, NULL, NULL, NULL, '2520010688', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('e2d6d163-2ea3-4cc9-a880-2be634fae7a9', 'adityajohari856@gmail.com', '$2a$10$PZSyIisBpT6oir.BOq/equ1sclwVIFlekJrmZ06vZNasInko1aUH.', 'Aditya Johari', NULL, NULL, NULL, NULL, NULL, '2520014167', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('e34e672e-bbd4-4594-b724-197647974039', 'harshmaindola27@gmail.com', '$2a$10$FOXbeHimQabBaojk485I7u/0fL7JRhm/tKIA5AXtJFz05HSGV5Vii', 'Harsh Maindola', NULL, NULL, NULL, NULL, NULL, '2520010482', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('e4545d75-ef48-476f-ba0f-7036da0c38b3', 'antrabhardwaj23@gmail.com', '$2a$10$GE2AANaPO/UXPCsCsXbVR.VDbzx24elgJqA9wRsdnY6hp94QYaU8e', 'Antra bhardwaj', NULL, NULL, NULL, NULL, NULL, '2520010533', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:58', '2026-05-02 12:00:58'),
('e469aad9-6670-498c-bc1a-ba4d8293ec68', 'demo@faculty.com', '$2a$10$5TbKcRww82tR8kFVMKiS2u4ZVejofsaumWxvzPU0mlpivADam8ypy', 'Faculty Demo', '', '', NULL, '', '', 'IT1212', 'ACTIVE', 'FACULTY', 'FACULTY', '2026-05-06 10:07:32', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-03 07:21:53', '2026-05-06 10:07:32'),
('e49794e2-dd15-4da1-8420-f9f50920e75f', 'gitanjalishukla10@gmail.com', '$2a$10$mCsED/MQ4aK7JUUEYXtnSe03YTifavBNFlUcIp64yfzyHTksUNewq', 'Gitanjali', NULL, NULL, NULL, NULL, NULL, '2520050001', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:51', '2026-05-02 12:00:51'),
('e611910f-2192-4ecd-958f-ef11427768eb', 'rishabmainali00@gmail.com', '$2a$10$YYzeG6egytuh7isETJ31feOkUnhSGAObRxERMS9X0FHEnSOxkRSky', 'Rishab mainali', NULL, NULL, NULL, NULL, NULL, '2520010055', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('e64ab048-5062-4c42-86a1-cc8bd9e5e23f', 'vipulkumar0864@gmail.com', '$2a$10$DRMu3YNvtKVxIrAoQOqCNOlZTu.M92JQql32.byF/UgXbRUheri.G', 'Vipul Kumar', NULL, NULL, NULL, NULL, NULL, '2520011309', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('e6b58b53-3a1a-47f3-9c7e-fc868a82d67a', 'payal601@gmail.com', '$2a$10$WuWX2vjtY0gk4kT2qbsBG./.uXQzByYKOYr4mP3ytJKrUTm5CTEIe', 'Payal', NULL, NULL, NULL, NULL, NULL, '2520020034', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('e6e82f84-d6f0-484a-b196-2e4d01ee32e4', 'samikshabhandari398@gmail.com', '$2a$10$adifarEJUGv93ZEHkxigNujMKxyMy9wnHbJsdW.gAg0b6MPGh8Z8K', 'Samiksha Bhandari', NULL, NULL, NULL, NULL, NULL, '2520010417', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('e768f5f2-1bcf-4cd1-ae9a-468c00a94768', 'vaibhavgarg23082004@gmail.com', '$2a$10$GKQWXgH/gaReYlVco99kfOk4PqvIOaPqFP7PXrlye6xKwA.0sPKF.', 'Vaibhav Garg', NULL, NULL, NULL, NULL, NULL, '2520010088', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:46', '2026-05-02 12:00:46'),
('ea533752-15c9-488f-be3e-58f7cec2e5c9', 'abhijeetraghav2k8.998@gmail.com', '$2a$10$YN/b1YoKy.pLDzFBN6lPaeMWGnD.qXqpeow9j8zsKJfjsoudoN5d.', 'Abhijeet Raghav', NULL, NULL, NULL, NULL, NULL, '2520010118', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:48', '2026-05-02 12:00:48'),
('ecf42fac-c692-4b6a-9cc8-385a969f5b98', 'khushisharma22004@gmail.com', '$2a$10$vBG0RLh567J1F4HDFbQGQO/CLV1IwRdJoX7xwyh4ph0EtHa2PuSrC', 'Khushi sharma', NULL, NULL, NULL, NULL, NULL, '2520013109', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:56', '2026-05-02 12:00:56'),
('ed45b1e6-fbf5-4170-b486-8bd1719fa8f7', 'coardinator123@example.com', '$2a$10$t/qE4KdyPsGmPuCswJd50OKWVTMHDDn4Vxtzxunc8E7/R6Jg6Seli', 'Placement', 'Coordinator', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'PLACEMENT_COORDINATOR', 'PLACEMENT_COORDINATOR', '2026-05-06 09:57:32', NULL, 1, NULL, NULL, NULL, '{}', '2026-05-06 09:56:54', '2026-05-06 09:57:32'),
('ed4f8518-3dda-4761-8452-ea80570b85b0', 'trishakulhan1@gmail.com', '$2a$10$oBMKPxyONquhQwXu8uI1UuVl1Wkhkh9bfiDaPI/ZCFQRIqkJet.rm', 'Trisha Kulhan', NULL, NULL, NULL, NULL, NULL, '2520012413', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:00', '2026-05-02 12:01:00'),
('ed600f10-ce68-4338-b2a2-1543ca51e593', 'nitingupta8469@gmail.com', '$2a$10$YqIsu39f/PTgJTIZ1IpF.e3w6m3B728u.c/wBN/gIYXVHznkANrge', 'KRISHANU GUPTA', NULL, NULL, NULL, NULL, NULL, '5163366', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('edd8d051-f2d9-4af4-aeda-ef4858ec9e7a', 'shivanknautiyal123@gmail.com', '$2a$10$izYA8cxw/4lJ7/tstaeLYu9Acb5RER.3v8IG34lCxeoLsRpucBqXu', 'Shivank Sharma', NULL, NULL, NULL, NULL, NULL, '2520010653', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:09', '2026-05-02 12:01:09'),
('ef57dac0-7915-4d03-a51b-463af7927e46', 'jhanvipal704@gmail.com', '$2a$10$rIQpy0lfWPRclbvdcObHs.xbH40.VL4.o./cqI3BrMiSOospdmZlq', 'Jhanvi Pal', NULL, NULL, NULL, NULL, NULL, '2523080005', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('f09f812a-7d36-479a-be7f-2be43ad99957', 'yashiscool73@gmail.com', '$2a$10$nOSz42QYKgTg9dhgs7Svauak4t45640UmuUsFU1QxDGknjf6RblKu', 'Anurag Singh', NULL, NULL, NULL, NULL, NULL, '2520010410', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:59', '2026-05-02 12:00:59'),
('f11e5488-f04d-43ae-9b50-3ef3deee9914', 'krishg0512@gmail.com', '$2a$10$Ki93QIcgQTb4bZMLPQB6Q.IHf.LnMZxTNId44qtMHez3mQE7dygSy', 'Krish Gupta', NULL, NULL, NULL, NULL, NULL, '2520010481', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('f4092a9c-0ac1-4e2f-8299-2ebe6d93b827', 'vs2190345@gmail.com', '$2a$10$WHc8w3gPXwOvmzmvg4LIS.w2t4hftFKAPuxe9bFw2hYU48h3Qq1d2', 'Abhinav Sharma', NULL, NULL, NULL, NULL, NULL, '2520010365', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('f44b6ba9-9884-4934-bcc5-b8ed74a7dbc2', 'igmmortal08@gmail.com', '$2a$10$c/kNmwRro3T/5XP3SfQi7uCpGIWCD0rLU6MHXH/zHNYd.X0oNS1Hy', 'Saksham Rauthan', NULL, NULL, NULL, NULL, NULL, '2520010438', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:45', '2026-05-02 12:00:45'),
('f46e2ec3-153f-4123-9cfd-40bb41b31bcf', 'harshitajain0912@gmail.com', '$2a$10$Pem6OBPxEDGHyuwQLK/Yz.JysXVBEbKALaoYsqwc83Ijzr7dZBOdS', 'Harshita Jain', NULL, NULL, NULL, NULL, NULL, '2520010075', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:03', '2026-05-02 12:01:03'),
('f497b1a6-7427-45d5-a8f6-e170f660d066', 'harsh882682@gmail.com', '$2a$10$oDK.zOOOE5uxUQ4cO4pbVeZGqTo.0ztQweXCiOyLP00LtDql7nJ9a', 'Harsh Pal', NULL, NULL, NULL, NULL, NULL, '2520010196', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:10', '2026-05-02 12:01:10'),
('f5759539-5d30-4ba0-abf2-825102c2198e', 'sakshamrawat970@gmail.com', '$2a$10$31MS47.XJLvnP9nQmObMWOIAZlTETj9NRBvJAKs1f.15Wafzib.R6', 'Saksham Rawat', NULL, NULL, NULL, NULL, NULL, '2520010487', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02'),
('f61805ac-dfe1-44bb-9551-87277a36f5bb', '2520010629@gmail.com', '$2a$10$fqFkOXhb/F4J10izqFyZMu74Z2oNLmRLilja.C7We7rlDEmjQ6GrK', 'Purva Gupta', NULL, NULL, NULL, NULL, NULL, '2520010629', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:07', '2026-05-02 12:01:07'),
('f62bfd92-993d-4b7a-a3ac-7c006afdf021', 'meenakshigururani00@gmail.com', '$2a$10$DK8l6Ge6ZCvxBgSxc0cAHu8ShH8KMl6euPrCTefAxbIfAuTBTiRhW', 'Meenakshi Gururani', NULL, NULL, NULL, NULL, NULL, '2520010437', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:50', '2026-05-02 12:00:50'),
('f85d64e2-e573-4482-9258-35ada113e48a', 'akshita0599@gmail.com', '$2a$10$KL8IurLPvHRnFHV94LovD.zttlMONobzGZp/Y5n61hkoeDBg9Jota', 'Akshita', NULL, NULL, NULL, NULL, NULL, '2520010261', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:54', '2026-05-02 12:00:54'),
('faf20bd6-57d3-4aa8-b45b-d050ad6f859d', 'misskhansana789@gmail.com', '$2a$10$R4ztjmNqcwyPxeYVtR33Pu.MFBYS/km5eKlkECAbJOOhundvIiNwa', 'Sana Parveen', NULL, NULL, NULL, NULL, NULL, '2520040009', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:06', '2026-05-02 12:01:06'),
('fb3cdd26-4da6-44cd-877e-243c7cdd1597', 'joshiankur765@gmail.com', '$2a$10$dOmeub78faigg7cftHgtZeMHz8BzdRS9DCO.GuHfYk2sbeODQT1yi', 'Ankur Joshi', NULL, NULL, NULL, NULL, NULL, '2520010690', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:04', '2026-05-02 12:01:04'),
('fb764a31-c5c6-4a7e-8edc-7f92395d1e56', 'pratyakshapathak24@gmail.com', '$2a$10$vqWZzABq6XlsVaHPz.dBGO2heHAfMT5Q1VJ2aLwYyvyx/vyTW7EMa', 'Pratyaksha Pathak', NULL, NULL, NULL, NULL, NULL, '2520010078', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:47', '2026-05-02 12:00:47'),
('fc5ca1b9-9974-4c9b-8e13-412416831a7d', 'medhachauhan12octmc@gmail.com', '$2a$10$Au7hqJV5OVtMLWOiQHU9yOvDW9pzXH8UylB3jTCP/1u/vq6Kve3JW', 'Medha Chauhan', NULL, NULL, NULL, NULL, NULL, '2520010045', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:55', '2026-05-02 12:00:55'),
('fcddf814-5d13-493e-beac-4414f471a9ab', 'amitaswal225@gmail.com', '$2a$10$Qv6IgmcAupPa4TgkQ3ifnuxul8hoFoG7JwIvn9CFDGKRsiYJHhvXK', 'Amit Aswal', NULL, NULL, NULL, NULL, NULL, '4958326', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:52', '2026-05-02 12:00:52'),
('fd294e27-3498-4cea-ad02-fb4cd672a034', 'mohitkumar1329mk@gmail.com', '$2a$10$dQ9.uqo/0PNt4AsG5Y2LzO/Egh2qxauUgFCNcNksLEZxGS7SzCfUS', 'Mohit kumar', NULL, NULL, NULL, NULL, NULL, '2520011026', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:00:53', '2026-05-02 12:00:53'),
('fd8b77d0-ec81-40ce-9d8a-d733b30fc9f3', 'ali.aqeel2019@gmail.com', '$2a$10$uaeXPrZbc1z7EGaXYmmMsOu0kmShaBRSyJyIjGS.gmXmD3jL2rJk.', 'Mohammad Ali', NULL, NULL, NULL, NULL, NULL, '2520370011', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:05', '2026-05-02 12:01:05');
INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `profile_image`, `department`, `employee_id`, `registration_number`, `status`, `requested_role`, `approved_role`, `last_login`, `last_password_change`, `is_verified`, `verification_token`, `reset_password_token`, `reset_password_expires`, `metadata`, `created_at`, `updated_at`) VALUES
('fdd3db07-5879-4ed3-a130-8d73da2cf181', 'vanshikajain2299@gmail.com', '$2a$10$CnxBJc2WIN82MGS/ESTNS.TbHZKvv5TmJYS46Wom2lKbCcpjXFzLS', 'Vanshika Jain', NULL, NULL, NULL, NULL, NULL, '2520010566', 'ACTIVE', 'STUDENT', 'STUDENT', NULL, NULL, 1, NULL, NULL, NULL, '{}', '2026-05-02 12:01:02', '2026-05-02 12:01:02');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `created_at`, `updated_at`, `role_id`, `user_id`) VALUES
('a103426c-eaaf-4b6a-8785-6653c31cea0c', '2026-05-02 11:58:17', '2026-05-02 11:58:17', '7a373c9f-c20e-492b-8c7a-b1874c1c65aa', 'b18e7ee1-745a-4929-8e13-d21a1b0169fb');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_sessions`
--
ALTER TABLE `academic_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `registration_token` (`registration_token`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `assessments`
--
ALTER TABLE `assessments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `academic_session_id` (`academic_session_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `assessment_assignments`
--
ALTER TABLE `assessment_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assessment_id` (`assessment_id`),
  ADD KEY `student_session_id` (`student_session_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `assessment_questions`
--
ALTER TABLE `assessment_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assessment_id` (`assessment_id`);

--
-- Indexes for table `assessment_responses`
--
ALTER TABLE `assessment_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `submission_id` (`submission_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `assessment_submissions`
--
ALTER TABLE `assessment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assessment_id` (`assessment_id`),
  ADD KEY `student_session_id` (`student_session_id`),
  ADD KEY `graded_by` (`graded_by`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user2_id` (`user2_id`),
  ADD KEY `conversations_user1_id_user2_id` (`user1_id`,`user2_id`);

--
-- Indexes for table `group_messages`
--
ALTER TABLE `group_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_messages_group_type_group_id` (`group_type`,`group_id`),
  ADD KEY `group_messages_sender_id` (`sender_id`);

--
-- Indexes for table `mentor_requirements`
--
ALTER TABLE `mentor_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `mentor_team_id` (`mentor_team_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `mentor_responses`
--
ALTER TABLE `mentor_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requirement_id` (`requirement_id`),
  ADD KEY `student_session_id` (`student_session_id`);

--
-- Indexes for table `mentor_teams`
--
ALTER TABLE `mentor_teams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `faculty_id` (`faculty_id`);

--
-- Indexes for table `mentor_team_members`
--
ALTER TABLE `mentor_team_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `mentor_team_id` (`mentor_team_id`),
  ADD KEY `student_session_id` (`student_session_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `conversation_id` (`conversation_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `message_files`
--
ALTER TABLE `message_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `message_id` (`message_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `rubrics`
--
ALTER TABLE `rubrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assessment_id` (`assessment_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `rubric_criteria`
--
ALTER TABLE `rubric_criteria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rubric_id` (`rubric_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `rubric_scores`
--
ALTER TABLE `rubric_scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `submission_id` (`submission_id`),
  ADD KEY `rubric_criteria_id` (`rubric_criteria_id`);

--
-- Indexes for table `session_categories`
--
ALTER TABLE `session_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `academic_session_id` (`academic_session_id`);

--
-- Indexes for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `student_sessions`
--
ALTER TABLE `student_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `academic_session_id` (`academic_session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `student_session_categories`
--
ALTER TABLE `student_session_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_session_id` (`student_session_id`),
  ADD KEY `session_category_id` (`session_category_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `registration_number` (`registration_number`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_roles_RoleId_UserId_unique` (`role_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `assessments`
--
ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `assessments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `assessment_assignments`
--
ALTER TABLE `assessment_assignments`
  ADD CONSTRAINT `assessment_assignments_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assessment_assignments_ibfk_2` FOREIGN KEY (`student_session_id`) REFERENCES `student_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `assessment_assignments_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `session_categories` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `assessment_questions`
--
ALTER TABLE `assessment_questions`
  ADD CONSTRAINT `assessment_questions_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `assessment_responses`
--
ALTER TABLE `assessment_responses`
  ADD CONSTRAINT `assessment_responses_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `assessment_submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assessment_responses_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `assessment_questions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `assessment_submissions`
--
ALTER TABLE `assessment_submissions`
  ADD CONSTRAINT `assessment_submissions_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assessment_submissions_ibfk_2` FOREIGN KEY (`student_session_id`) REFERENCES `student_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `assessment_submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `group_messages`
--
ALTER TABLE `group_messages`
  ADD CONSTRAINT `group_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `mentor_requirements`
--
ALTER TABLE `mentor_requirements`
  ADD CONSTRAINT `mentor_requirements_ibfk_1` FOREIGN KEY (`mentor_team_id`) REFERENCES `mentor_teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mentor_requirements_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `mentor_responses`
--
ALTER TABLE `mentor_responses`
  ADD CONSTRAINT `mentor_responses_ibfk_1` FOREIGN KEY (`requirement_id`) REFERENCES `mentor_requirements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mentor_responses_ibfk_2` FOREIGN KEY (`student_session_id`) REFERENCES `student_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `mentor_teams`
--
ALTER TABLE `mentor_teams`
  ADD CONSTRAINT `mentor_teams_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `mentor_teams_ibfk_2` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `mentor_team_members`
--
ALTER TABLE `mentor_team_members`
  ADD CONSTRAINT `mentor_team_members_ibfk_1` FOREIGN KEY (`mentor_team_id`) REFERENCES `mentor_teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mentor_team_members_ibfk_2` FOREIGN KEY (`student_session_id`) REFERENCES `student_sessions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `message_files`
--
ALTER TABLE `message_files`
  ADD CONSTRAINT `message_files_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `rubrics`
--
ALTER TABLE `rubrics`
  ADD CONSTRAINT `rubrics_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `rubrics_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `rubric_criteria`
--
ALTER TABLE `rubric_criteria`
  ADD CONSTRAINT `rubric_criteria_ibfk_1` FOREIGN KEY (`rubric_id`) REFERENCES `rubrics` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `rubric_criteria_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `assessment_questions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `rubric_scores`
--
ALTER TABLE `rubric_scores`
  ADD CONSTRAINT `rubric_scores_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `assessment_submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `rubric_scores_ibfk_2` FOREIGN KEY (`rubric_criteria_id`) REFERENCES `rubric_criteria` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `session_categories`
--
ALTER TABLE `session_categories`
  ADD CONSTRAINT `session_categories_ibfk_1` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `student_sessions`
--
ALTER TABLE `student_sessions`
  ADD CONSTRAINT `student_sessions_ibfk_1` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_sessions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `student_session_categories`
--
ALTER TABLE `student_session_categories`
  ADD CONSTRAINT `student_session_categories_ibfk_1` FOREIGN KEY (`student_session_id`) REFERENCES `student_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `student_session_categories_ibfk_2` FOREIGN KEY (`session_category_id`) REFERENCES `session_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `student_session_categories_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
