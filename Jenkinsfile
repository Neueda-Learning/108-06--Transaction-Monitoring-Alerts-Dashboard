pipeline {
    agent any

    environment {
        COMPOSE_CMD = 'docker-compose'
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Validate Env File') {
            steps {
                sh 'test -f .env || cp .env.example .env'
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh "${COMPOSE_CMD} down || true"
            }
        }

        stage('Build Docker Images') {
            steps {
                sh "${COMPOSE_CMD} config"
                sh "${COMPOSE_CMD} build --no-cache"
            }
        }

        stage('Deploy') {
            steps {
                sh "${COMPOSE_CMD} up -d"
            }
        }

        stage('Verify') {
            steps {
                sh "${COMPOSE_CMD} ps"
            }
        }
    }
}
