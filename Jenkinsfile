pipeline {
    agent any

    environment {
        COMPOSE_CMD = 'docker-compose'
        COMPOSE_FILE = 'docker-compose.yml'
        GEMINI_API_KEY = credentials('GEMINI_API_KEY')
        DB_PASSWORD = credentials('DB_PASSWORD')
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Create Env File') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    echo "GEMINI_API_KEY=$GEMINI_API_KEY" > .env
                    echo "DB_PASSWORD=$DB_PASSWORD" >> .env

                    echo "Environment file created"
                    echo "Variables present:"
                    sed 's/=.*/=***masked***/' .env
                '''
            }
        }

        stage('Validate Compose File') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    pwd
                    ls -la

                    test -f ${COMPOSE_FILE}

                    docker-compose -f ${COMPOSE_FILE} config > /tmp/compose-config.yml
                    echo "Compose validation successful"
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} down || true
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    echo "Checking resolved environment variables:"
                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} config | grep -E "GEMINI_API_KEY|DB_PASSWORD" || true

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} build --no-cache
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} up -d
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} ps
                '''
            }
        }
    }

    post {
        always {
            sh '''
                rm -f "$WORKSPACE/.env"
            '''
        }
    }
}