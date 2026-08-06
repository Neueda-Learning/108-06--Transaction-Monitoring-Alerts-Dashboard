pipeline {

    agent any

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh 'docker compose down || true'
            }
        }

        stage('Build Docker Images') {
            steps {
                // Requires a .env file already present in the workspace root on the
                // VM (not committed to git) with DB_PASSWORD / GEMINI_API_KEY set.
                // Copy .env.example to .env once on the server and fill in values.
                sh 'docker compose build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
            }
        }

        stage('Verify') {
            steps {
                sh 'docker ps'
            }
        }
    }
}
