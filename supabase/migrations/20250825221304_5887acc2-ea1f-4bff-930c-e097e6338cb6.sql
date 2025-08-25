-- Add unique constraints for Jira data to enable proper upserts
ALTER TABLE jira_projects ADD CONSTRAINT jira_projects_jira_id_config_id_unique UNIQUE (jira_id, config_id);
ALTER TABLE jira_issues ADD CONSTRAINT jira_issues_jira_id_config_id_unique UNIQUE (jira_id, config_id);