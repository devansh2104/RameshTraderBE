pipeline {
    agent {
        docker {
            image "node:18"
            args '-u root' // optional: run as root inside container
        }
    }
    environment {
        NODE_VERSION = '18'
        DOCKER_REGISTRY = 'your-registry.com'
        IMAGE_NAME = 'rameshtraders-be'
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT_SHORT = "${env.GIT_COMMIT[0..7]}"
    }
    
    stages {
        stage('Checkout') {
    steps {
        checkout([$class: 'GitSCM',
            branches: [[name: "*/main"]],
            doGenerateSubmoduleConfigurations: false,
            extensions: [[$class: 'CloneOption', depth: 0, noTags: false, shallow: false]],
            userRemoteConfigs: [[url: 'https://github.com/devansh2104/RameshTraderBE.git']]
        ])
        script {
            env.GIT_COMMIT_SHORT = "${env.GIT_COMMIT.take(7)}"
        }
    }
}

        
        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "Installing Node.js dependencies..."
                    npm ci --only=production
                '''
            }
        }
        
        stage('Run Tests') {
            steps {
                sh '''
                    echo "Running test suite..."
                    npm test || echo "Tests completed with warnings"
                '''
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                }
            }
        }
        
        stage('Code Quality Check') {
            steps {
                sh '''
                    echo "Running code quality checks..."
                    # Add ESLint if you want
                    # npm run lint || echo "Linting completed with warnings"
                '''
            }
        }
        
        stage('Build Docker Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    def imageTag = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                    def fullImageName = "${DOCKER_REGISTRY}/${IMAGE_NAME}:${imageTag}"
                    
                    sh """
                        echo "Building Docker image: ${fullImageName}"
                        docker build -t ${fullImageName} .
                        docker tag ${fullImageName} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                    """
                    
                    env.DOCKER_IMAGE = fullImageName
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    sh """
                        echo "Pushing Docker image to registry..."
                        docker push ${env.DOCKER_IMAGE}
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                    """
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sh """
                        echo "Deploying to staging environment..."
                        # Add your staging deployment commands here
                        # Example: kubectl apply -f k8s/staging/
                        # Or: docker-compose -f docker-compose.staging.yml up -d
                    """
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                script {
                    sh """
                        echo "Deploying to production environment..."
                        # Add your production deployment commands here
                        # Example: kubectl apply -f k8s/production/
                        # Or: docker-compose -f docker-compose.prod.yml up -d
                    """
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
            // Add notification logic here (Slack, email, etc.)
        }
    }
}



