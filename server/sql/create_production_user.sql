-- Run this on your MySQL server (via Hostinger console or mysql client)
-- Replace placeholders in angle brackets

-- Create a dedicated database user for the deals247 database
CREATE USER '<DB_USER>'@'<VPS_IP_or_%>' IDENTIFIED BY '<strong_password_here>';

-- Grant only necessary privileges (read + write + limited DDL if necessary)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER ON `<DB_NAME>`.* TO '<DB_USER>'@'<VPS_IP_or_%>';

-- Flush privileges to apply
FLUSH PRIVILEGES;

-- (Optional) Verify permissions
-- SHOW GRANTS FOR '<DB_USER>'@'<VPS_IP_or_%>';
